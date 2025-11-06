import type { DailyLogItem, NutritionInfo } from '../types';

// Helper to get a date string like 'YYYY-MM-DD' in the local timezone
const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper to get an array of Date objects for the past N days
const getPastNDates = (n: number): Date[] => {
    return Array.from({ length: n }, (_, i) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        return d;
    }).reverse();
};

// --- WEEKLY DATA PROCESSING ---

export interface WeeklyChartData {
    labels: string[]; // e.g., ['Mon', 'Tue', ...]
    calorieData: (number | null)[];
    proteinData: (number | null)[];
    carbData: (number | null)[];
    fatData: (number | null)[];
    calorieAvg: number;
    proteinAvg: number;
    carbAvg: number;
    fatAvg: number;
    dailyTotals: Record<string, NutritionInfo>;
}

export const processWeeklyData = (log: DailyLogItem[]): WeeklyChartData => {
    const last7Days = getPastNDates(7);
    const dailyTotals: Record<string, NutritionInfo> = {};
    let loggedDaysCount = 0;

    last7Days.forEach(date => {
        const dateStr = toLocalDateString(date);
        dailyTotals[dateStr] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    });

    log.forEach(item => {
        const itemDate = new Date(item.timestamp);
        const dateStr = toLocalDateString(itemDate);
        if (dailyTotals[dateStr]) {
            dailyTotals[dateStr].calories += item.nutrition.calories;
            dailyTotals[dateStr].protein += item.nutrition.protein;
            dailyTotals[dateStr].carbs += item.nutrition.carbs;
            dailyTotals[dateStr].fat += item.nutrition.fat;
        }
    });

    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    Object.values(dailyTotals).forEach(day => {
        if (day.calories > 0) {
            loggedDaysCount++;
            totals.calories += day.calories;
            totals.protein += day.protein;
            totals.carbs += day.carbs;
            totals.fat += day.fat;
        }
    });
    
    const safeLoggedDaysCount = loggedDaysCount || 1;

    return {
        labels: last7Days.map(d => d.toLocaleDateString('en-US', { weekday: 'short' })),
        calorieData: last7Days.map(d => dailyTotals[toLocalDateString(d)].calories || null),
        proteinData: last7Days.map(d => dailyTotals[toLocalDateString(d)].protein || null),
        carbData: last7Days.map(d => dailyTotals[toLocalDateString(d)].carbs || null),
        fatData: last7Days.map(d => dailyTotals[toLocalDateString(d)].fat || null),
        calorieAvg: totals.calories / safeLoggedDaysCount,
        proteinAvg: totals.protein / safeLoggedDaysCount,
        carbAvg: totals.carbs / safeLoggedDaysCount,
        fatAvg: totals.fat / safeLoggedDaysCount,
        dailyTotals,
    };
};

// --- MONTHLY DATA PROCESSING ---

export interface HeatmapData {
    date: string; // YYYY-MM-DD
    value: number; // calorie intake
    level: 0 | 1 | 2 | 3 | 4; // 0: no data, 1: under, 2: good, 3: slightly over, 4: very over
}

export interface MonthlyChartData {
    heatmapData: HeatmapData[];
    weeklyAvgCalories: { week: string; value: number }[];
    topFoods: { name: string; count: number }[];
}

export const processMonthlyData = (log: DailyLogItem[], calorieGoal: number): MonthlyChartData => {
    const last30Days = getPastNDates(30);
    const dailyTotals: Record<string, number> = {};
    const foodFrequency: Record<string, number> = {};

    last30Days.forEach(date => {
        dailyTotals[toLocalDateString(date)] = 0;
    });

    log.forEach(item => {
        const itemDate = new Date(item.timestamp);
        const dateStr = toLocalDateString(itemDate);
        if (dailyTotals[dateStr] !== undefined) {
            dailyTotals[dateStr] += item.nutrition.calories;
            foodFrequency[item.foodName] = (foodFrequency[item.foodName] || 0) + 1;
        }
    });

    const heatmapData = Object.entries(dailyTotals).map(([date, value]) => {
        let level: HeatmapData['level'] = 0;
        if (value > 0) {
            const ratio = value / calorieGoal;
            if (ratio < 0.85) level = 1; // Under
            else if (ratio <= 1.1) level = 2; // Good
            else if (ratio <= 1.25) level = 3; // Slightly over
            else level = 4; // Very over
        }
        return { date, value, level };
    });

    // Calculate weekly averages for the last 4 weeks
    const weeklyAvgCalories: { week: string; value: number }[] = [];
    for (let i = 3; i >= 0; i--) {
        const weekStartDate = getPastNDates(7 * (i + 1))[0];
        const weekDates = Array.from({ length: 7 }, (_, dayIndex) => {
            const d = new Date(weekStartDate);
            d.setDate(d.getDate() + dayIndex);
            return d;
        });

        const weekTotals = weekDates.map(d => dailyTotals[toLocalDateString(d)] || 0);
        const loggedDays = weekTotals.filter(v => v > 0);
        const avg = loggedDays.length > 0 ? loggedDays.reduce((a, b) => a + b, 0) / loggedDays.length : 0;
        weeklyAvgCalories.push({ week: `Week ${4-i}`, value: avg });
    }


    const topFoods = Object.entries(foodFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    return { heatmapData, weeklyAvgCalories, topFoods };
};
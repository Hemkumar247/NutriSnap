import React, { useState, useMemo } from 'react';
import type { DailyLogItem, NutritionInfo } from '../types';
import { processWeeklyData, processMonthlyData, WeeklyChartData, MonthlyChartData } from '../utils/dataUtils';
import { CalorieIcon, ProteinIcon, CarbIcon, FatIcon } from './IconComponents';

// --- Reusable Chart Components (Self-Contained) ---

const SvgLineChart: React.FC<{ data: (number | null)[]; labels: string[]; goal: number; height?: number, color?: string }> = ({ data, labels, goal, height = 250, color = 'text-cyan-400' }) => {
    const width = 500;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const validData = data.filter(d => d !== null) as number[];
    const dataMax = Math.max(...validData, goal) * 1.1;

    const points = data
        .map((d, i) => {
            if (d === null) return null;
            const x = padding.left + (i / (data.length - 1)) * chartWidth;
            const y = padding.top + chartHeight - (d / dataMax) * chartHeight;
            return `${x},${y}`;
        })
        .filter(p => p !== null);
    
    const path = points.join(' L ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            {/* Grid Lines */}
            {[...Array(5)].map((_, i) => (
                <line key={i}
                    x1={padding.left} y1={padding.top + (i / 4) * chartHeight}
                    x2={width - padding.right} y2={padding.top + (i / 4) * chartHeight}
                    className="stroke-slate-700/50" strokeWidth="1"
                />
            ))}
            
            {/* Goal Line */}
            <line
                x1={padding.left} y1={padding.top + chartHeight - (goal / dataMax) * chartHeight}
                x2={width - padding.right} y2={padding.top + chartHeight - (goal / dataMax) * chartHeight}
                className="stroke-purple-500" strokeWidth="2" strokeDasharray="4"
            />
            <text x={padding.left + 5} y={padding.top + chartHeight - (goal / dataMax) * chartHeight - 5} className="fill-purple-400 text-xs font-semibold">Goal</text>

            {/* Data Line */}
            {path && <path d={`M ${path}`} className={`stroke-current ${color}`} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
            
            {/* Data Points */}
            {points.map((p, i) => {
                const [x, y] = p.split(',');
                return <circle key={i} cx={x} cy={y} r="3" className={`fill-current ${color}`} />
            })}

            {/* Axes and Labels */}
            {labels.map((label, i) => (
                <text key={i} x={padding.left + (i / (labels.length - 1)) * chartWidth} y={height - 5}
                    className="fill-slate-400 text-xs text-anchor-middle">{label}
                </text>
            ))}
            <text x="5" y={padding.top + 5} className="fill-slate-400 text-xs">{Math.round(dataMax)}</text>
            <text x="5" y={height - padding.bottom} className="fill-slate-400 text-xs">0</text>
        </svg>
    );
};

const SvgStackedBarChart: React.FC<{ data: WeeklyChartData; height?: number }> = ({ data, height = 250 }) => {
    const width = 500;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const totals = data.proteinData.map((p, i) => (p || 0) + (data.carbData[i] || 0) + (data.fatData[i] || 0));
    const dataMax = Math.max(...totals) * 1.1;
    const barWidth = chartWidth / (data.labels.length * 2);

    return (
         <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            {/* Grid & Axis */}
            <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} className="stroke-slate-600" />
            <text x="5" y={padding.top + 5} className="fill-slate-400 text-xs">{Math.round(dataMax)}g</text>
            <text x="5" y={height - padding.bottom} className="fill-slate-400 text-xs">0</text>
            
            {/* Bars */}
            {data.labels.map((label, i) => {
                const x = padding.left + (chartWidth / data.labels.length) * (i + 0.5) - barWidth / 2;
                const p = (data.proteinData[i] || 0);
                const c = (data.carbData[i] || 0);
                const f = (data.fatData[i] || 0);
                const total = p + c + f;
                
                if (total === 0) return null;

                const pHeight = (p / dataMax) * chartHeight;
                const cHeight = (c / dataMax) * chartHeight;
                const fHeight = (f / dataMax) * chartHeight;
                
                const yFat = height - padding.bottom - fHeight;
                const yCarb = yFat - cHeight;
                const yProtein = yCarb - pHeight;

                return (
                    <g key={i}>
                        <rect x={x} y={yFat} width={barWidth} height={fHeight} className="fill-orange-500" rx="2" />
                        <rect x={x} y={yCarb} width={barWidth} height={cHeight} className="fill-cyan-500" rx="2" />
                        <rect x={x} y={yProtein} width={barWidth} height={pHeight} className="fill-pink-500" rx="2" />
                        <text x={x + barWidth / 2} y={height - 15} className="fill-slate-400 text-xs text-anchor-middle">{label}</text>
                    </g>
                );
            })}
        </svg>
    );
};


const SvgCalendarHeatmap: React.FC<{ data: MonthlyChartData['heatmapData'] }> = ({ data }) => {
    const cellSize = 16;
    const cellPadding = 4;
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const colorScale = ['fill-slate-700/50', 'fill-sky-700', 'fill-green-600', 'fill-yellow-500', 'fill-red-600'];
    const startDate = new Date(data[0].date);
    const startDay = startDate.getUTCDay();

    return (
        <svg viewBox={`0 0 ${(cellSize + cellPadding) * 7 + 20} ${(cellSize + cellPadding) * 6}`} className="w-full max-w-sm mx-auto">
            {weekDays.map((day, i) => (
                <text key={i} x={i * (cellSize + cellPadding) + cellSize/2} y="10" className="text-xs fill-slate-400 text-anchor-middle">{day}</text>
            ))}
            {data.map((dayData, i) => {
                const dayIndex = startDay + i;
                const week = Math.floor(dayIndex / 7);
                const dayOfWeek = dayIndex % 7;
                const x = dayOfWeek * (cellSize + cellPadding);
                const y = week * (cellSize + cellPadding) + 20;

                return (
                    <rect
                        key={i}
                        x={x}
                        y={y}
                        width={cellSize}
                        height={cellSize}
                        rx="3"
                        className={colorScale[dayData.level]}
                    >
                        <title>{dayData.date}: {dayData.value.toFixed(0)} kcal</title>
                    </rect>
                )
            })}
        </svg>
    );
};

// --- Main Page Component ---

interface DeepAnalysisPageProps {
  log: DailyLogItem[];
  goals: NutritionInfo;
}

export const DeepAnalysisPage: React.FC<DeepAnalysisPageProps> = ({ log, goals }) => {
    const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');
    
    const weeklyData = useMemo(() => processWeeklyData(log), [log]);
    const monthlyData = useMemo(() => processMonthlyData(log, goals.calories), [log, goals.calories]);

    const MacroDonut: React.FC<{ label: string, current: number, goal: number, color: string, icon: React.ReactElement }> = ({ label, current, goal, color, icon }) => {
        const percentage = goal > 0 ? Math.min((current / goal), 1) : 0;
        const circumference = 2 * Math.PI * 20;
        const offset = circumference - percentage * circumference;
        return (
            <div className="flex flex-col items-center">
                <div className="relative w-24 h-24">
                    <svg viewBox="0 0 50 50" className="-rotate-90">
                        <circle cx="25" cy="25" r="20" className="stroke-slate-700" strokeWidth="5" fill="transparent" />
                        <circle cx="25" cy="25" r="20" className={`stroke-current ${color}`} strokeWidth="5" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-slate-100">{icon}</div>
                </div>
                <p className="mt-2 font-bold text-lg text-slate-100">{Math.round(current)}<span className="text-sm text-slate-400">/{goal}g</span></p>
                <p className="text-xs text-slate-400">{label}</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Timeframe Selector */}
            <div className="flex justify-center bg-slate-800/50 p-1 rounded-full max-w-xs mx-auto">
                <button
                    onClick={() => setTimeframe('weekly')}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-all w-1/2 ${timeframe === 'weekly' ? 'bg-cyan-400 text-slate-900' : 'text-slate-300'}`}
                >Weekly</button>
                <button
                    onClick={() => setTimeframe('monthly')}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-all w-1/2 ${timeframe === 'monthly' ? 'bg-cyan-400 text-slate-900' : 'text-slate-300'}`}
                >Monthly</button>
            </div>

            {/* Weekly View */}
            {timeframe === 'weekly' && (
                <div className="space-y-8">
                    <div className="corner-box">
                        <h3 className="text-xl font-bold text-cyan-300 mb-4">7-Day Calorie Trend</h3>
                        <SvgLineChart data={weeklyData.calorieData} labels={weeklyData.labels} goal={goals.calories} />
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                         <div className="corner-box md:col-span-2">
                            <h3 className="text-xl font-bold text-cyan-300 mb-4">7-Day Macronutrient Mix</h3>
                            <SvgStackedBarChart data={weeklyData} />
                             <div className="flex justify-center space-x-4 mt-4 text-xs">
                                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-pink-500 mr-2"></div>Protein</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-cyan-500 mr-2"></div>Carbs</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>Fat</div>
                            </div>
                        </div>
                         <div className="corner-box">
                            <h3 className="text-xl font-bold text-cyan-300 mb-6 text-center">Avg. Macros</h3>
                            <div className="flex flex-col justify-around h-full space-y-4">
                               <MacroDonut label="Protein" current={weeklyData.proteinAvg} goal={goals.protein} color="text-pink-500" icon={<ProteinIcon className="w-6 h-6"/>} />
                               <MacroDonut label="Carbs" current={weeklyData.carbAvg} goal={goals.carbs} color="text-cyan-500" icon={<CarbIcon className="w-6 h-6"/>} />
                               <MacroDonut label="Fat" current={weeklyData.fatAvg} goal={goals.fat} color="text-orange-500" icon={<FatIcon className="w-6 h-6"/>} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Monthly View */}
            {timeframe === 'monthly' && (
                <div className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="corner-box">
                            <h3 className="text-xl font-bold text-cyan-300 mb-4">30-Day Calorie Heatmap</h3>
                            <p className="text-sm text-slate-400 mb-4">How consistently you're meeting your calorie goal ({goals.calories} kcal).</p>
                            <SvgCalendarHeatmap data={monthlyData.heatmapData} />
                             <div className="flex justify-center flex-wrap gap-x-3 gap-y-1 mt-4 text-xs">
                                <div className="flex items-center"><div className="w-3 h-3 rounded bg-sky-700 mr-1.5"></div>Under</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded bg-green-600 mr-1.5"></div>Good</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded bg-yellow-500 mr-1.5"></div>Over</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded bg-red-600 mr-1.5"></div>High</div>
                            </div>
                        </div>
                         <div className="corner-box">
                            <h3 className="text-xl font-bold text-cyan-300 mb-4">Top 5 Logged Foods</h3>
                             <ul className="space-y-3">
                                {monthlyData.topFoods.map(food => (
                                    <li key={food.name} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg">
                                        <span className="font-semibold text-slate-200 truncate pr-4">{food.name}</span>
                                        <span className="text-sm font-bold bg-cyan-400/20 text-cyan-300 px-2 py-1 rounded-full">{food.count}x</span>
                                    </li>
                                ))}
                                {monthlyData.topFoods.length === 0 && <p className="text-slate-400 text-center py-8">Not enough data yet.</p>}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

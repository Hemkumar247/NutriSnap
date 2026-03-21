import React, { useState, useEffect } from 'react';
import { UserProfile, AppSettings, NutritionInfo } from '../types';
import { UserIcon } from './IconComponents';
import { soundService } from '../services/soundService';

interface ProfilePageProps {
    profile: UserProfile;
    settings: AppSettings;
    onSaveProfile: (profile: UserProfile) => void;
    onRecalculateGoals: (profile: UserProfile) => void;
}

const CM_TO_INCHES = 0.393701;
const KG_TO_LBS = 2.20462;

export const ProfilePage: React.FC<ProfilePageProps> = ({ profile, settings, onSaveProfile, onRecalculateGoals }) => {
    const [formData, setFormData] = useState<UserProfile>(profile);
    const [heightFt, setHeightFt] = useState('');
    const [heightIn, setHeightIn] = useState('');
    const [weightLbs, setWeightLbs] = useState('');

    useEffect(() => {
        setFormData(profile);
        if (settings.units === 'imperial') {
            const totalInches = profile.height * CM_TO_INCHES;
            setHeightFt(Math.floor(totalInches / 12).toString());
            setHeightIn(Math.round(totalInches % 12).toString());
            setWeightLbs(Math.round(profile.weight * KG_TO_LBS).toString());
        }
    }, [profile, settings.units]);

    const handleMetricChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'name' ? value : name === 'gender' || name === 'activityLevel' ? value : Number(value) || 0 }));
    };
    

    const handleImperialChange = () => {
        const ft = Number(heightFt) || 0;
        const inches = Number(heightIn) || 0;
        const lbs = Number(weightLbs) || 0;
        const totalInches = (ft * 12) + inches;
        
        setFormData(prev => ({
            ...prev,
            height: Math.round(totalInches / CM_TO_INCHES),
            weight: Math.round(lbs / KG_TO_LBS)
        }));
    };
    
    useEffect(() => {
        if (settings.units === 'imperial') {
            handleImperialChange();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [heightFt, heightIn, weightLbs, settings.units]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveProfile(formData);
        soundService.play('success');
    };

    const handleRecalculate = () => {
        onRecalculateGoals(formData);
        soundService.play('start');
    }

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
            <div className="corner-box">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-white text-4xl flex-shrink-0">
                            {formData.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-grow w-full">
                             <label htmlFor="name" className="input-label">Name</label>
                             <input type="text" name="name" id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-style" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div>
                            <label htmlFor="age" className="input-label">Age</label>
                            <input type="number" name="age" id="age" value={formData.age || ''} onChange={handleMetricChange} className="input-style" />
                        </div>
                        <div>
                            <label htmlFor="gender" className="input-label">Gender</label>
                            <select name="gender" id="gender" value={formData.gender} onChange={handleMetricChange} className="input-style">
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="activityLevel" className="input-label">Activity Level</label>
                            <select name="activityLevel" id="activityLevel" value={formData.activityLevel} onChange={handleMetricChange} className="input-style">
                                <option value="sedentary">Sedentary</option>
                                <option value="light">Lightly Active</option>
                                <option value="moderate">Moderately Active</option>
                                <option value="very">Very Active</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {settings.units === 'metric' ? (
                             <>
                                <div>
                                    <label htmlFor="weight" className="input-label">Weight (kg)</label>
                                    <input type="number" name="weight" id="weight" value={formData.weight || ''} onChange={handleMetricChange} className="input-style" />
                                </div>
                                <div>
                                    <label htmlFor="height" className="input-label">Height (cm)</label>
                                    <input type="number" name="height" id="height" value={formData.height || ''} onChange={handleMetricChange} className="input-style" />
                                </div>
                             </>
                        ) : (
                            <>
                                <div>
                                    <label htmlFor="weightLbs" className="input-label">Weight (lbs)</label>
                                    <input type="number" name="weightLbs" id="weightLbs" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} className="input-style" />
                                </div>
                                <div>
                                    <label htmlFor="heightFt" className="input-label">Height</label>
                                    <div className="flex gap-2">
                                        <input type="number" name="heightFt" id="heightFt" placeholder="ft" value={heightFt} onChange={e => setHeightFt(e.target.value)} className="input-style" />
                                        <input type="number" name="heightIn" id="heightIn" placeholder="in" value={heightIn} onChange={e => setHeightIn(e.target.value)} className="input-style" />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" className="px-6 py-2 bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-semibold rounded-full hover:shadow-md hover:shadow-cyan-500/20 transition-all active:scale-95">
                            Save Profile
                        </button>
                    </div>
                </form>
            </div>
            
            <div className="corner-box flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-cyan-300">Recalculate Daily Goals</h3>
                    <p className="text-slate-400 text-sm max-w-lg">Use your profile information to get a personalized recommendation for your daily nutritional goals based on scientific formulas.</p>
                </div>
                 <button onClick={handleRecalculate} className="px-6 py-2 bg-slate-700 border border-slate-600 text-slate-200 font-semibold rounded-full hover:bg-slate-600 transition-all active:scale-95 whitespace-nowrap">
                    Recalculate Goals
                </button>
            </div>
            
             <style>{`
                .input-label { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-medium; color: var(--text-light); }
                .input-style { background-color: var(--input-bg); color: var(--text-color); border: 1px solid var(--input-border); border-radius: 0.5rem; padding: 0.5rem 0.75rem; width: 100%; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
                .input-style:focus { outline: none; border-color: var(--brand-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-accent) 50%, transparent); }
             `}</style>
        </div>
    );
};

'use client';

import { useState, useEffect } from 'react';
import { getRanking, RankingPeriod, RankingUser, getUserRank } from '@/services/GamificationService';
import { Trophy, Medal, Crown, Shield, Zap, Award, Star } from 'lucide-react';
import { getFullName, getUserInitials } from '@/utils/userUtils';

export function RankingBoard() {
    const [period, setPeriod] = useState<RankingPeriod>('all');
    const [ranking, setRanking] = useState<RankingUser[]>([]);
    const [loading, setLoading] = useState(true);

    const RankIcon = ({ name, className }: { name: string; className?: string }) => {
        switch (name) {
            case 'shield': return <Shield className={className} />;
            case 'zap': return <Zap className={className} />;
            case 'award': return <Award className={className} />;
            case 'star': return <Star className={className} />;
            case 'crown': return <Crown className={className} />;
            case 'trophy': return <Trophy className={className} />;
            default: return <Medal className={className} />;
        }
    };

    useEffect(() => {
        const fetchRanking = async () => {
            setLoading(true);
            try {
                const data = await getRanking(period);
                setRanking(data);
            } catch (error) {
                console.error("Failed to load ranking", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRanking();
    }, [period]);

    const getMedalIcon = (index: number) => {
        switch (index) {
            case 0: return <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500" />;
            case 1: return <Medal className="w-6 h-6 text-gray-400 fill-gray-400" />;
            case 2: return <Medal className="w-6 h-6 text-amber-700 fill-amber-700" />;
            default: return <span className="font-bold text-muted-foreground w-6 text-center">{index + 1}</span>;
        }
    };

    const getRowStyle = (index: number) => {
        switch (index) {
            case 0: return "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20";
            case 1: return "bg-gradient-to-r from-gray-400/10 to-transparent border-gray-400/20";
            case 2: return "bg-gradient-to-r from-amber-700/10 to-transparent border-amber-700/20";
            default: return "hover:bg-muted/50 border-transparent";
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Filters */}
            <div className="flex justify-center p-1 bg-muted rounded-xl w-fit mx-auto">
                {(['week', 'month', 'year', 'all'] as RankingPeriod[]).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {p === 'week' && 'Semana'}
                        {p === 'month' && 'Mes'}
                        {p === 'year' && 'Año'}
                        {p === 'all' && 'Histórico'}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : ranking.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Aún no hay puntos registrados en este periodo.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {ranking.map((item, index) => (
                        <div
                            key={item.userId}
                            className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${getRowStyle(index)}`}
                        >
                            <div className="w-8 flex justify-center flex-shrink-0">
                                {getMedalIcon(index)}
                            </div>

                            <div className="flex-1 flex items-center gap-3">
                                {item.user?.avatar ? (
                                    <img src={item.user.avatar} className="w-10 h-10 rounded-full bg-muted object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                        {getUserInitials(item.user)}
                                    </div>
                                )}
                                <div>
                                    <p className="font-bold text-foreground line-clamp-1">{getFullName(item.user)}</p>
                                    <div className="flex items-center gap-1">
                                        <RankIcon name={getUserRank(item.points).icon} className={`w-3 h-3 ${getUserRank(item.points).color}`} />
                                        <p className={`text-[10px] font-bold uppercase tracking-wider ${getUserRank(item.points).color}`}>
                                            {getUserRank(item.points).name}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <span className="font-mono font-bold text-lg text-primary">
                                    {item.points.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">pts</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

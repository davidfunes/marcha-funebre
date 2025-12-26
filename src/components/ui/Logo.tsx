import Image from 'next/image';
import { isChristmasTime } from '@/utils/dateUtils';
import { useChristmas } from '@/hooks/useChristmas';

interface LogoProps {
    className?: string;
    showText?: boolean;
    variant?: 'default' | 'white' | 'icon-only';
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    layout?: 'horizontal' | 'vertical';
}

export function Logo({
    className = '',
    showText = true,
    variant = 'default',
    size = 'md',
    layout = 'horizontal'
}: LogoProps) {
    const isChristmas = useChristmas();

    const sizeClasses = {
        sm: 'h-8',
        md: 'h-10',
        lg: 'h-16',
        xl: 'h-24',
        '2xl': 'h-32'
    };

    const textClasses = {
        sm: 'text-sm',
        md: 'text-lg',
        lg: 'text-2xl',
        xl: 'text-4xl',
        '2xl': 'text-5xl'
    };

    const logoSize = {
        sm: 32,
        md: 40,
        lg: 64,
        xl: 96,
        '2xl': 128
    };

    const containerClasses = layout === 'vertical'
        ? 'flex-col justify-center text-center'
        : 'flex-row items-center';

    return (
        <div className={`flex ${containerClasses} gap-3 ${className}`}>
            <div className={`relative aspect-square flex-shrink-0 ${sizeClasses[size]}`}>
                {isChristmas && (
                    <div className="absolute -top-1 -right-1 z-10 animate-pulse text-yellow-400">
                        <span className="text-sm">✨</span>
                    </div>
                )}
                <Image
                    src="/logo.png"
                    alt="Marcha Fúnebre Logo"
                    width={logoSize[size]}
                    height={logoSize[size]}
                    className="object-contain w-full h-full drop-shadow-md"
                    priority
                    unoptimized
                />
            </div>

            {showText && variant !== 'icon-only' && (
                <div className={`font-display font-bold leading-tight tracking-tight ${textClasses[size]} ${variant === 'white' ? 'text-white' : 'text-foreground'}`}>
                    Marcha<span className={isChristmas ? "text-primary italic animate-subtle-glow" : "text-primary"}>Fúnebre</span>
                    {isChristmas && <span className="ml-1 text-xs align-top inline-block hover:animate-spin transition-all">⭐</span>}
                </div>
            )}
        </div>
    );
}

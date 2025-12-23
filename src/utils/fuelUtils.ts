/**
 * Convierte un nivel de combustible (0-100) en una frase amigable en castellano.
 */
export const getFuelLevelMessage = (level: number | string): { message: string, color: string } => {
    const l = typeof level === 'string' ? parseInt(level, 10) : level;

    if (l >= 90) {
        return { message: "El depósito está lleno. ¡Tienes autonomía de sobra!", color: "text-green-500" };
    }
    if (l >= 70) {
        return { message: "Nivel de combustible óptimo para continuar la marcha.", color: "text-green-400" };
    }
    if (l >= 40) {
        return { message: "Tienes aproximadamente medio depósito. Todo en orden.", color: "text-yellow-500" };
    }
    if (l >= 20) {
        return { message: "Combustible un poco bajo. Considera repostar al finalizar el servicio.", color: "text-orange-500" };
    }
    if (l > 0) {
        return { message: "¡Atención! Nivel de combustible bajo. Busca una gasolinera pronto.", color: "text-red-500 font-bold" };
    }
    return { message: "Vehículo en reserva. Repostaje inmediato requerido.", color: "text-red-600 font-bold animate-pulse" };
};

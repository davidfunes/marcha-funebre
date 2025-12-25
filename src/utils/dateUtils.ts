/**
 * Checks if the current date falls within the Christmas season.
 * Defined as December 15th to January 7th.
 */
export function isChristmasTime(): boolean {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed (11 = December, 0 = January)
    const date = now.getDate();

    // From December 15th
    if (month === 11 && date >= 15) {
        return true;
    }

    // Until January 7th
    if (month === 0 && date <= 7) {
        return true;
    }

    return false;
}

const API_URL = 'http://localhost:5000/api';

/**
 * Creates a new battle record in MongoDB.
 * @param {Object} battleData - the structured player data
 * @returns {Promise<string>} The new Battle ID
 */
export async function createBattle(battleData) {
    const res = await fetch(`${API_URL}/battles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(battleData),
    });

    if (!res.ok) throw new Error('Failed to create battle');
    const data = await res.json();
    return data.battleId;
}

/**
 * Updates an existing battle (e.g. adding winner, narrative, video URL later).
 * @param {string} battleId
 * @param {Object} updateData
 */
export async function updateBattle(battleId, updateData) {
    const res = await fetch(`${API_URL}/battles/${battleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
    });

    if (!res.ok) throw new Error('Failed to update battle');
    return await res.json();
}

/**
 * Fetches the gallery list of all battles.
 */
export async function getBattles() {
    const res = await fetch(`${API_URL}/battles`);
    if (!res.ok) throw new Error('Failed to fetch battles');
    return await res.json();
}

/**
 * Fetches a single battle's details.
 */
export async function getBattle(battleId) {
    const res = await fetch(`${API_URL}/battles/${battleId}`);
    if (!res.ok) throw new Error('Failed to fetch battle');
    return await res.json();
}

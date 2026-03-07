import { createContext, useContext, useReducer } from 'react';

const initialPlayer = {
    name: '',
    color: '',
    battleCry: '',
    drawingURL: '',
    voiceDescription: '',
    powerProfile: null,
};

const initialState = {
    player1: { ...initialPlayer },
    player2: { ...initialPlayer },
    currentBattle: {
        winnerId: '',
        battleNarrative: '',
        videoURL: '',
        verdicts: null,
    },
};

function battleReducer(state, action) {
    switch (action.type) {
        case 'UPDATE_PLAYER1':
            return { ...state, player1: { ...state.player1, ...action.payload } };
        case 'UPDATE_PLAYER2':
            return { ...state, player2: { ...state.player2, ...action.payload } };
        case 'SET_BATTLE_RESULT':
            return { ...state, currentBattle: { ...state.currentBattle, ...action.payload } };
        case 'RESET':
            return { ...initialState };
        default:
            return state;
    }
}

const BattleContext = createContext(null);

export function BattleProvider({ children }) {
    const [state, dispatch] = useReducer(battleReducer, initialState);

    return (
        <BattleContext.Provider value={{ state, dispatch }}>
            {children}
        </BattleContext.Provider>
    );
}

export function useBattleContext() {
    const context = useContext(BattleContext);
    if (!context) {
        throw new Error('useBattleContext must be used within a BattleProvider');
    }
    return context;
}

/**
 * EconomySystem.js
 * Arquitectura base escalable para los dos sistemas de recompensa independientes:
 * - Puntos: registro de rendimiento y puntuación.
 * - Dinero: divisa exclusiva para compra de equipamiento y armas.
 */

export class EconomySystem {
    constructor(saveSystem) {
        this.saveSystem = saveSystem;
    }

    getMoney() {
        return this.saveSystem.state.economy.money;
    }

    getScore() {
        return this.saveSystem.state.economy.score;
    }

    getHighScore() {
        return this.saveSystem.state.economy.highScore;
    }

    addMoney(amount) {
        const validAmount = Math.max(0, Math.floor(Number(amount) || 0));
        if (validAmount === 0) return this.getMoney();
        this.saveSystem.state.economy.money += validAmount;
        this.saveSystem.save();
        return this.getMoney();
    }

    spendMoney(cost) {
        const validCost = Math.max(0, Math.floor(Number(cost) || 0));
        if (this.getMoney() < validCost) {
            return false;
        }
        this.saveSystem.state.economy.money -= validCost;
        this.saveSystem.save();
        return true;
    }

    addScore(points) {
        const validPoints = Math.max(0, Math.floor(Number(points) || 0));
        if (validPoints === 0) return this.getScore();
        this.saveSystem.state.economy.score += validPoints;
        if (this.saveSystem.state.economy.score > this.saveSystem.state.economy.highScore) {
            this.saveSystem.state.economy.highScore = this.saveSystem.state.economy.score;
        }
        this.saveSystem.save();
        return this.getScore();
    }
}

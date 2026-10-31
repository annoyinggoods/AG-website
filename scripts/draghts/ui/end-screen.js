import { activeRulesLabel } from "./localStorage.js";
export class EndScreen {
    constructor(container, config) {
        this.trigger = null;
        this.keyHandler = null;
        this.container = container;
        this.config = config;
    }
    show(state) {
        this.trigger = document.activeElement;
        const result = state.result;
        const winnerText = result ? (result.winner === "tie" ? "Tie" : result.winner.toUpperCase()) : "Unknown";
        const reasonText = result ? reasonLabel(result.reason) : "Unknown";
        const rulesText = activeRulesLabel(state.rules);
        this.container.innerHTML = `
      <div class="end-overlay" role="dialog" aria-label="Game over" aria-modal="true">
        <h2>Game Over</h2>
        <p class="end-result">Winner: <strong>${winnerText}</strong></p>
        <p>Reason: <strong>${reasonText}</strong></p>
        <div class="end-scores">
          <div>White: ${state.scores.white}</div>
          <div>Purple: ${state.scores.purple}</div>
        </div>
        <div class="end-kills">
          <div>White kills: ${state.kills.white}</div>
          <div>Purple kills: ${state.kills.purple}</div>
        </div>
        <div class="end-rules">Rules: <span class="rule-chip-row"><span class="rule-chip">${rulesText}</span></span></div>
        <div class="end-actions">
          <button type="button" id="play-again-btn">Play Again</button>
          <button type="button" id="change-rules-btn">Change Rules</button>
        </div>
      </div>
    `;
        this.container.style.display = "flex";
        const playBtn = this.container.querySelector("#play-again-btn");
        const rulesBtn = this.container.querySelector("#change-rules-btn");
        if (playBtn) {
            playBtn.addEventListener("click", () => {
                const settings = { rules: state.rules };
                this.hide();
                this.config.onPlayAgain(settings);
            });
        }
        if (rulesBtn) {
            rulesBtn.addEventListener("click", () => {
                this.hide();
                this.config.onChangeRules();
            });
        }
        this.keyHandler = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                this.hide();
                this.config.onChangeRules();
            }
        };
        document.addEventListener("keydown", this.keyHandler);
        if (playBtn)
            playBtn.focus();
    }
    hide() {
        this.container.style.display = "none";
        if (this.keyHandler) {
            document.removeEventListener("keydown", this.keyHandler);
            this.keyHandler = null;
        }
        if (this.trigger && document.contains(this.trigger)) {
            this.trigger.focus();
        }
        this.trigger = null;
    }
}
function reasonLabel(reason) {
    if (reason === "wipeout")
        return "Wipeout";
    if (reason === "blockage")
        return "Blockage";
    if (reason === "twenty-rounds")
        return "20-round";
    return reason;
}
//# sourceMappingURL=end-screen.js.map
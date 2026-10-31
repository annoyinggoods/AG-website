var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _InstructionsUI_instances, _InstructionsUI_details, _InstructionsUI_wideQuery, _InstructionsUI_applyOpenState;
import { createElement } from "./dom.js";
export function unitNoun(level) {
    return level.scoutEnd === "pair" ? "Pair" : "Card";
}
export function instructionsForLevel(level) {
    const sections = [];
    sections.push(whatThisLevelIsSection(level));
    sections.push(...scoutSections(level));
    sections.push(theRunSection(level));
    sections.push(winningSection(level));
    const levelRules = levelRuleSections(level);
    if (levelRules.length > 0) {
        sections.push(...levelRules);
    }
    return sections;
}
function whatThisLevelIsSection(level) {
    const size = `${level.cols} by ${level.rows}`;
    const noun = unitNoun(level).toLowerCase();
    const count = level.units.length;
    const faces = describeFaces(level);
    const lines = [
        `This is a ${size} grid with ${count} ${noun}s on it${faces}.`,
        "Every game deals a brand new random shuffle, so no two games look the same.",
    ];
    if (level.scoutEnd === "pair") {
        lines.push(pairKindLine(level));
    }
    else {
        lines.push("Every card on this level is different. Your job is to find them all in the right order.");
    }
    return { heading: `Level ${level.id}`, lines };
}
function pairKindLine(level) {
    if (level.id === 5) {
        return "Each pair is one number and one letter, and the number tells you which letter it belongs with.";
    }
    return "Each pair is two cards showing the same thing. Your job is to find all the pairs.";
}
function describeFaces(level) {
    const faces = level.units.map((unit) => unit.faces[0] ?? "");
    if (faces.length === 0) {
        return "";
    }
    if (hasShuffledOrder(level)) {
        return describeFaceSet(faces);
    }
    if (level.id === 5) {
        return " (numbers and letters)";
    }
    const first = faces[0];
    const last = faces[faces.length - 1];
    return ` (${first} through ${last})`;
}
function describeFaceSet(faces) {
    const letters = faces.filter((face) => /^[A-Z]$/.test(face));
    const numbers = faces.filter((face) => /^\d+$/.test(face));
    const parts = [];
    if (letters.length > 0) {
        parts.push(`${letters.length} letters`);
    }
    if (numbers.length > 0) {
        parts.push(`${numbers.length} numbers`);
    }
    if (parts.length === 0) {
        return "";
    }
    return ` (${parts.join(" and ")})`;
}
function hasShuffledOrder(level) {
    return level.orderPopup !== null && level.orderPopup.kind === "metered";
}
function scoutSections(level) {
    const orderSource = orderSourcePhrase(level);
    if (level.scoutEnd === "pair") {
        return [
            {
                heading: "Part 1: Look around",
                lines: [
                    "Turn over any cards you like and have a good look at them. Nothing hides while you do this and you cannot lose any points.",
                    `The very first card you turn over chooses your pair. ${anchorPickLine(level)}`,
                    "Keep turning cards over until you find the other half of that pair. That is when Part 1 ends.",
                    `If you turn over ${level.scoutCap} cards and still have not found it, the board hides everything, costs you nothing, and Part 1 starts over.`,
                ],
            },
            {
                heading: "Part 2: The run",
                lines: [
                    "Now you know one pair for certain: the pair you started with. That pair is called your anchor.",
                    `${orderSource} It starts with your anchor and then goes in order from there.`,
                    "Turn over the cards in that order. Once you turn over a card it stays face up, so you can see where you are.",
                    "Turn over the wrong card and you lose 1 point. The board hides everything, and the run starts again from your anchor.",
                    "The first time you turn over any particular card costs you nothing, because the look-around already told you what was on it. Turn over the same card a second time and it costs 1 point.",
                    "There is one exception. When only two cards are still hidden, no wrong guess is free, because you could work out the answer without looking.",
                ],
            },
        ];
    }
    return [
        {
            heading: "Part 1: Look around",
            lines: [
                "Turn over any cards you like and have a good look at them. Nothing hides while you do this and you cannot lose any points.",
                `The very first card you turn over is your anchor. ${orderSource}`,
                "Keep turning cards over until you find the card that comes straight after your anchor in the order. That is when Part 1 ends.",
                `If you turn over ${level.scoutCap} cards and still have not found it, the board hides everything, costs you nothing, and Part 1 starts over.`,
            ],
        },
        {
            heading: "Part 2: The run",
            lines: [
                "Now the order to play is settled, starting from your anchor and wrapping around the end of the list.",
                "Turn over the cards in that order. Once you turn over a card it stays face up, so you can see where you are.",
                "Turn over the wrong card and you lose 1 point. The board hides everything, and the run starts again from your anchor.",
                "The first time you turn over any particular card costs you nothing, because the look-around already told you what was on it. Turn over the same card a second time and it costs 1 point.",
                "There is one exception. When only two cards are still hidden, no wrong guess is free, because you could work out the answer without looking.",
            ],
        },
    ];
}
function orderSourcePhrase(level) {
    if (hasShuffledOrder(level)) {
        return "The order you memorized shows what comes after it.";
    }
    return "The list under the board shows what comes after it.";
}
function anchorPickLine(level) {
    if (level.id === 5) {
        return "Say you turn over a 4. Your pair is now the 4 and the D that goes with it.";
    }
    return "Say you turn over a 4. Your pair is now the two 4s.";
}
function theRunSection(level) {
    return {
        heading: "What wrapping around means",
        lines: wrapAroundExample(level),
    };
}
function wrapAroundExample(level) {
    const faces = level.units.map((unit) => unit.faces[0] ?? "");
    if (faces.length < 4) {
        return [
            "You play every card once, starting from your anchor and working forwards through the list.",
            "When you reach the end of the list you carry on from the beginning again, so every card gets its turn.",
        ];
    }
    if (hasShuffledOrder(level)) {
        return [
            "The order you memorized runs in a circle, so it does not matter where your anchor sits.",
            "You play your anchor, then the card that comes after it in the order you memorized, and carry on all the way round until every card has been played.",
        ];
    }
    if (level.id === 5) {
        return [
            "The list runs in a circle, so it does not matter where your anchor sits.",
            "You play your anchor pair, then the next pair along, and carry on all the way round until every pair has been played.",
        ];
    }
    const anchorIndex = 2;
    const anchorFace = faces[anchorIndex];
    const ordered = [...faces.slice(anchorIndex), ...faces.slice(0, anchorIndex)];
    const head = ordered.slice(0, 4);
    const tail = ordered.slice(4, 7);
    const last = ordered[ordered.length - 1];
    return [
        `Say your anchor is ${anchorFace}. You play ${head.join(", ")}, then carry on with ${tail.join(", ")}, and so on until you finish with ${last}.`,
        "That is what wrapping around means. You do not stop at the end of the list, you carry on from the beginning until every card has been played.",
    ];
}
function winningSection(level) {
    const noun = unitNoun(level).toLowerCase();
    const lines = [
        `You win by playing every ${noun} in one single go with no mistakes.`,
        "You get 1 point for each one you finish, but only the first time you finish it. Your score can go below zero.",
    ];
    if (level.timeRule.kind === "countdown") {
        lines.push("If you run out of time, that attempt is over and you start the level again.");
    }
    return { heading: "Winning and scoring", lines };
}
function levelRuleSections(level) {
    const sections = [];
    if (level.timeRule.kind === "countdown") {
        const totalSeconds = Math.round(level.timeRule.totalMs / 1000);
        const marks = level.timeRule.penaltyMarksMs.map((mark) => Math.round(mark / 1000));
        const markList = marks.join(", ");
        const firstMark = marks[0] ?? 0;
        const freeSeconds = totalSeconds - firstMark;
        sections.push({
            heading: "The Level 3 countdown",
            lines: [
                `You have ${totalSeconds} seconds and the clock starts the moment you press PLAY. If it reaches zero you lose that attempt.`,
                `The first ${freeSeconds} seconds are free. After that you lose 2 points every 20 seconds, so you will see -2 appear at ${markList} seconds left.`,
                "Finishing the level before the clock runs out is the whole trick on this level.",
            ],
        });
    }
    if (level.id === 4) {
        sections.push(level4Section());
    }
    if (level.id === 5) {
        sections.push(...level5Sections());
    }
    if (level.id === 6) {
        sections.push(...level6Sections());
    }
    return sections;
}
function level4Section() {
    return {
        heading: "The Level 4 order",
        lines: [
            "Every card on this level is different, so there is nothing to match up. The list under the board is the order to play.",
            "Turn cards over in the order the list gives, starting from your anchor and wrapping around the end of the list.",
            "Get one wrong and the board hides everything, and you start the run again from your anchor.",
        ],
    };
}
function level5Sections() {
    return [
        {
            heading: "The Level 5 pairs",
            lines: [
                "The number tells you the letter. 1 goes with A, 2 goes with B, 3 goes with C, and so on up to 18 and R.",
                "So the 1 and the A are a pair, the 2 and the B are a pair, and the 18 and the R are a pair.",
                "You can turn either half of a pair over first, but you cannot turn over a third card in between.",
            ],
        },
        {
            heading: "When the order list disappears",
            lines: [
                "The list under the board shows you the order until you finish 3 pairs. After that it hides itself.",
                "By then you should have the rule in your head, which is the whole point of this level.",
                "If you do want to check the order later, press REVEAL THE ORDER. It blocks the board while it is open and it costs you no points, but the clock keeps running.",
            ],
        },
    ];
}
function level6Sections() {
    return [
        {
            heading: "The Level 6 order",
            lines: [
                "The order changes every game, so there is nothing to learn. You have to remember it.",
                "When you press PLAY the clock starts and the order appears for 15 free seconds. Look at it, then memorize it.",
                "The list closes itself when the 15 seconds are up. Nothing is lost if you close it early.",
            ],
        },
        {
            heading: "REVEAL THE ORDER",
            lines: [
                "If you need to check the order later, press REVEAL THE ORDER under the board.",
                "The first second of every look is free, so you get a moment to find your place before anything is charged.",
                "After that, every started 1.5 seconds of looking costs you 1 point. Look for 3 seconds and that is 2 points.",
                "The board is blocked while the list is open and the clock keeps running, so use it carefully.",
                "After that the scout and the run work exactly like Level 4, against the order you memorized.",
            ],
        },
    ];
}
export class InstructionsUI {
    constructor(root) {
        _InstructionsUI_instances.add(this);
        _InstructionsUI_details.set(this, void 0);
        _InstructionsUI_wideQuery.set(this, void 0);
        __classPrivateFieldSet(this, _InstructionsUI_details, createElement("details", "nag-instructions"), "f");
        __classPrivateFieldGet(this, _InstructionsUI_details, "f").append(createElement("summary", "nag-instructions-title", "How to play"));
        __classPrivateFieldSet(this, _InstructionsUI_wideQuery, window.matchMedia("(min-width: 48rem)"), "f");
        __classPrivateFieldGet(this, _InstructionsUI_wideQuery, "f").addEventListener("change", () => __classPrivateFieldGet(this, _InstructionsUI_instances, "m", _InstructionsUI_applyOpenState).call(this));
        root.append(__classPrivateFieldGet(this, _InstructionsUI_details, "f"));
    }
    render(level) {
        const sections = instructionsForLevel(level).map((section, index) => {
            const block = createElement("section", "nag-instruction");
            block.append(createElement(headingTag(index), "nag-instruction-heading", section.heading));
            const list = createElement("ul", "nag-instruction-list");
            for (const line of section.lines) {
                list.append(createElement("li", "nag-instruction-item", line));
            }
            block.append(list);
            return block;
        });
        const content = createElement("div", "nag-instructions-body");
        content.append(...sections);
        __classPrivateFieldGet(this, _InstructionsUI_details, "f").replaceChildren(createElement("summary", "nag-instructions-title", "How to play"), content);
        __classPrivateFieldGet(this, _InstructionsUI_instances, "m", _InstructionsUI_applyOpenState).call(this);
    }
}
_InstructionsUI_details = new WeakMap(), _InstructionsUI_wideQuery = new WeakMap(), _InstructionsUI_instances = new WeakSet(), _InstructionsUI_applyOpenState = function _InstructionsUI_applyOpenState() {
    __classPrivateFieldGet(this, _InstructionsUI_details, "f").open = __classPrivateFieldGet(this, _InstructionsUI_wideQuery, "f").matches;
};
/**
 * The page title is the h1 and the first instruction block is the level
 * itself, so the level heading is the h2 of the instructions and the blocks
 * below it are h3. That keeps the heading order valid without an extra
 * heading that would only repeat the region label.
 */
function headingTag(index) {
    return index === 0 ? "h2" : "h3";
}
//# sourceMappingURL=instructions.js.map
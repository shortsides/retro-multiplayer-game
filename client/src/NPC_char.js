import { SPRITES } from "../../index.js";

export const innkeeperConfig = {
            x: 590,
            y: 470,
            key: 'npc-innkeeper',
            spritesheet: 'sprites1',
            spritenum: 4,
            dialogue: {
                hello: {
                    question: true,
                    say: ["Hi, I'm the innkeeper. Would you like to hear how I can assist you?"],
                    answers: [
                        {
                        reply: "Yes",
                        linkTo: "tutorial"
                        },
                        {
                        reply: "No",
                        linkTo: "thanks"
                        }
                    ]
                },
                tutorial: {
                    question: false,
                    say: [
                        "Okay, I'll tell you what I do.",
                        "I can pour you a nice refreshing beer for 10 coins if you like.",
                        "I can also make you new weapons from stuff you find out on your adventures."
                    ],
                    linkTo: "anythingElse"
                },
                anythingElse: {
                    question: true,
                    say: ["Need anything else, darl?"],
                    answers: [
                        {
                        reply: "Yes",
                        linkTo: "tutorial"
                        },
                        {
                        reply: "No",
                        linkTo: "thanks"
                        }
                    ]
                },
                thanks: {
                    question: false,
                    say: [
                        "Seeya later."
                    ],
                    linkTo: false
                }
            }
        };

export const propellerConfig = {
    x: 780,
    y: 943,
    width: 32,
    height: 32,
    key: 'npc-propeller',
    dialogue: {
        hello: {
            question: false,
            say: ["It looks like some sort of propeller..."],
            linkTo: "actionQuestion"
        },
        actionQuestion: {
            question: true,
            say: ["Would you like to pick it up?"],
            answers: [
                {
                reply: "Yes",
                linkTo: "actionYes"
                },
                {
                reply: "No",
                linkTo: "actionNo"
                }
            ]
        },
        actionYes: {
            question: false,
            say: [
                "Picked up the propeller!"
            ],
            linkTo: false
        },
        actionNo: {
            question: false,
            say: [
                "Did not pick up the propeller."
            ],
            linkTo: false
        }
    }
}
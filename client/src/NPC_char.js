import { SPRITES } from "../../index.js";

export const innkeeperConfig = {
            //scene: scene.scene,
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
                    say: [
                        "Need anything else, darl?"
                    ],
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
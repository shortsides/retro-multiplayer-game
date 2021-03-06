
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
    width: 40,
    height: 40,
    spritesheet: 'propeller',
    spritenum: 0,
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
                function: {
                    type: "pickUp",
                    props: {
                        name: 'propeller',
                        spritePath: './assets/sprites/propeller.png',
                        info: 'Airplane propeller',
                    }
                },
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
            function: {
                type: "callbackScene",
                props: {
                    callback: 'removePropeller',
                }
            },
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

export const pilotConfig = {
    x: 960, 
    y: 624,
    width: 1,
    height: 20,
    spritesheet: 'sprites1',
    spritenum: 44,
    key: 'npc-pilot',
    dialogue: {
        hello: {
            question: false,
            say: ["I'm so sorry but I seem to have crash landed my plane right here in your town, and the propeller has come clean off!"],
            linkTo: "actionQuestion"
        },
        actionQuestion: {
            question: true,
            say: ["You wouldn't be able to help me search for the missing propeller would you?"],
            answers: [
                {
                reply: "Yes",
                linkTo: "actionYes",
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
                "Splendid! Let me know if you find it."
            ],
            linkTo: false
        },
        actionNo: {
            question: false,
            say: [
                "... how rude ..."
            ],
            linkTo: false
        },
        foundPropeller: {
            question: false,
            say: [
                "Oh!", 
                "You found my plane's propeller!"
            ],
            linkTo: "takePropeller"
        },
        takePropeller: {
            question: false,
            say: [
                "How can I thank you? Let me see uh...",
            ],
            function: {
                type: "giveItem",
                props: {
                    name: 'propeller',
                    num: 1
                }
            },
            linkTo: "giveSword"
        },
        giveSword: {
            question: false,
            say: [
                "I know! I'll give you this sword.",
                "*Obtained Old Sword!*",
                "It was given to me by my grandfather so take good care of it.",
                "I've heard you can swing it around by pressing 'a', but be careful not to swing it too close to people or you might hurt them.",
            ],
            function: {
                type: "pickUp",
                props: {
                    name: 'old-sword',
                    class: 'sword',
                    spritePath: './assets/sprites/old_sword.png',
                    info: 'Old Sword',
                }
            },
            linkTo: "goodBye"
        },
        goodBye: {
            question: false,
            say: [
                "Well. Now that I have this propeller I can get my plane going again!",
                "Ok. I'd best be going now.",
            ],
            linkTo: "takeOff"
        },
        takeOff: {
            question: false,
            say: ["Goodbye!"],
            function: {
                type: "callbackScene",
                props: {
                    callback: 'planeFlyAway',
                }
            },
            linkTo: false
        },
    }
}

export const forestHermitConfig = {
    x: 500,
    y: 490,
    key: 'npc-forestHermit',
    spritesheet: 'sprites3',
    spritenum: 40,
    dialogue: {
        hello: {
            question: false,
            say: [
                "Hello.",
                "...",
                "Sorry, I'm not very good with people. I don't get visitors very often.",
                "...",
                "Oh. You're still here.",
                "Um. Well, since you're here there is something you could help me with.",
                "There's some blue berries that grow on a tree deep in the forest. They make a really beautiful blue dye that I like.",
            ],
            linkTo: "canYouHelp"
        },
        canYouHelp: {
            question: true,
            say: ["Will you help me find 5 blue berries?"],
            answers: [
                {
                reply: "Yes",
                function: {
                    type: "acceptQuest",
                    props: {
                        id: 1,
                        name: 'Find 5 blue berries',
                        completed: false
                    }
                },
                linkTo: "thanks"
                },
                {
                reply: "No",
                linkTo: "goodBye"
                }
            ]
        },
        thanks: {
            question: false,
            say: [
                "Thanks! Bring them back here when you find them."
            ],
            linkTo: false
        },
        goodBye: {
            question: false,
            say: [
                "Oh... Ok."
            ],
            linkTo: false
        },
        questProgressCheck: {
            question: false,
            say: ["Did you find me the blue berries yet?"],
            linkTo: false
        },
        foundBerries: {
            question: false,
            say: ["Oh it's you! And you actually found me the berries?!",],
            linkTo: "giveBerries"
        },
        giveBerries: {
            question: false,
            say: [
                "I never thought you'd actually be so kind and find them for me.",
                "I... I thought you'd leave me alone like everyone else does."
            ],
            function: {
                type: "giveItem",
                props: {
                    name: 'blue berry',
                    num: 5
                }
            },
            linkTo: "payReward"
        },
        payReward: {
            question: false,
            say: [
                "Here, take this money. Please, I insist.",
                "*Obtained 20 coins!*",
            ],
            function: {
                type: "addCoins",
                props: {
                    coinCount: 20
                }
            },
            linkTo: "seeYa"
        },
        seeYa: {
            question: false,
            say: ["Hope you buy something nice."],
            linkTo: false
        },
        questCompleted: {
            question: false,
            say: ["Hiya, thanks for your help earlier!"],
            linkTo: false
        },
    }
};

export const berryTreeConfig = {
    x: 844,
    y: 721,
    width: 80,
    height: 80,
    spritesheet: 'berry-tree',
    spritenum: 0,
    key: 'npc-berryTree',
    dialogue: {
        hello: {
            question: false,
            say: ["*Obtained a blue berry!*"],
            linkTo: false
        },
    }
}

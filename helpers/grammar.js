import { Llama, LlamaGrammar } from "node-llama-cpp";

/**
 * Create the JSON schema for the AI response
 * 
 * @param { Llama } llama
 * @return {Promise<LlamaGrammar>}
 */
export async function getGrammar(llama) {
    try {
        const grammar = await llama.createGrammarForJsonSchema({
            "type": "object",
            "properties": {
                "title": {
                    "type": "string"
                },
                "summary": {
                    "type": "string"
                },
                "main_points": {
                    "type": "object",
                    "properties": {
                        "item_1": {
                            "type": "string"
                        },
                        "item_2": {
                            "type": "string"
                        },
                        "item_3": {
                            "type": "string"
                        },
                        "item_4": {
                            "type": "string"
                        },
                        "item_5": {
                            "type": "string"
                        }
                    }
                },
                "action_items": {
                    "type": "object",
                    "properties": {
                        "item_1": {
                            "type": "string"
                        },
                        "item_2": {
                            "type": "string"
                        },
                        "item_3": {
                            "type": "string"
                        },
                        "item_4": {
                            "type": "string"
                        },
                        "item_5": {
                            "type": "string"
                        }
                    }
                },
                "follow_up": {
                    "type": "object",
                    "properties": {
                        "item_1": {
                            "type": "string"
                        },
                        "item_2": {
                            "type": "string"
                        },
                        "item_3": {
                            "type": "string"
                        }
                    }
                },
                "stories": {
                    "type": "object",
                    "properties": {
                        "item_1": {
                            "type": "string"
                        },
                        "item_2": {
                            "type": "string"
                        },
                        "item_3": {
                            "type": "string"
                        }
                    }
                },
                "references": {
                    "type": "object",
                    "properties": {
                        "item_1": {
                            "type": "string"
                        },
                        "item_2": {
                            "type": "string"
                        },
                        "item_3": {
                            "type": "string"
                        }
                    }
                },
                "arguments": {
                    "type": "object",
                    "properties": {
                        "item_1": {
                            "type": "string"
                        },
                        "item_2": {
                            "type": "string"
                        },
                        "item_3": {
                            "type": "string"
                        }
                    }
                },
                "related_topics": {
                    "type": "object",
                    "properties": {
                        "item_1": {
                            "type": "string"
                        },
                        "item_2": {
                            "type": "string"
                        },
                        "item_3": {
                            "type": "string"
                        },
                        "item_4": {
                            "type": "string"
                        },
                        "item_5": {
                            "type": "string"
                        }
                    }
                },
                "sentiment": {
                    "type": "string"
                }
            }
        })
    
        return grammar
    } catch (error) {
        throw new Error(`Failed to create JSON schema: ${error.message}`);
    }
}
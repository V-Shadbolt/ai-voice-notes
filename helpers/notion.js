import { Client } from "@notionhq/client"

/**
 * Create AI prompt for JSON schema and provide transcript
 * 
 * @param { Client } notion
 * @param { string } DATABASE_ID
 * @param { object } chatResponse
 * @return { Promise<import("@notionhq/client/build/src/api-endpoints").CreatePageResponse> }
 */
export async function createNotionPage(notion, DATABASE_ID, chatResponse) {
    const today = new Date();
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")
    const date = `${year}-${month}-${day}`

    const data = {
        parent: {
            type: "database_id",
            database_id: DATABASE_ID,
        },
        icon: {
            type: "emoji",
            emoji: "🤖",
        },
        properties: {
            "Title": {
                title: [
                    {
                        text: {
                            content: chatResponse.title,
                        },
                    },
                ],
            },
            "Type": {
                select: {
                    name: chatResponse.tag,
                },
            },
            "Duration (Seconds)": {
                number: chatResponse.duration,
            },
            "Date": {
                date: {
                    start: date,
                },
            },
            "Size": {
                rich_text: [
                    {
                        text: {
                            content: chatResponse.size
                        }
                    }
                ]
            },
        },
        children: [
            {
                callout: {
                    rich_text: [
                        {
                            text: {
                                content: "This AI transcription/summary was created on ",
                            },
                        },
                        {
                            mention: {
                                type: "date",
                                date: {
                                    start: date,
                                },
                            },
                        },
                        {
                            text: {
                                content: ". ",
                            },
                        },
                        {
                            text: {
                                content: "Listen to the original recording here.",
                                link: {
                                    url: chatResponse.url,
                                },
                            },
                        },
                    ],
                    color: "blue_background",
                },
            },
            {
                table_of_contents: {
                    color: "default",
                },
            },
        ],
    }

    const response = await notion.pages.create(data)
    return response
}

/**
 * Create AI prompt for JSON schema and provide transcript
 * 
 * @param { Client } notion
 * @param { import("@notionhq/client/build/src/api-endpoints").CreatePageResponse } page
 * @param { object } chatResponse
 * @param { Array } transcript
 * @return { Promise<import("@notionhq/client/build/src/api-endpoints").UpdatePageResponse> }
 */
export async function populateNotionPage(notion, page, chatResponse, transcript) {
    const data = {
        block_id: page.id.replace(/-/g, ""),
        children: [],
    };

    const summaryHeader = {
        heading_1: {
            rich_text: [
                {
                    text: {
                        content: "Summary",
                    },
                },
            ],
        },
    };
    data.children.push(summaryHeader);

    const summaryBlock = {
        paragraph: {
            rich_text: [
                {
                    text: {
                        content: chatResponse.summary,
                    },
                },
            ],
        },
    };

    data.children.push(summaryBlock);

    const transcriptHeader = {
        heading_1: {
            rich_text: [
                {
                    text: {
                        content: "Transcript",
                    },
                },
            ],
        },
    };

    data.children.push(transcriptHeader);

    for (let i = 0; i < transcript.length; i += 4) {
        const paragraphBlock = {
            paragraph: {
                rich_text: [
                    {
                        text: {
                            content: transcript.slice(i, i + 4).join(" "),
                        },
                    },
                ],
            },
        };

        data.children.push(paragraphBlock);
    }

    const infoSectionHeader = {
        heading_1: {
            rich_text: [
                {
                    text: {
                        content: "Info",
                    },
                },
            ],
        },
    };

    data.children.push(infoSectionHeader);

    const sections = [
        {
            arr: Object.values(chatResponse.main_points),
            header: "Main Points",
            itemType: "bulleted_list_item",
        },
        {
            arr: Object.values(chatResponse.stories),
            header: "Stories and Examples",
            itemType: "bulleted_list_item",
        },
        {
            arr: Object.values(chatResponse.references),
            header: "References and Citations",
            itemType: "bulleted_list_item",
        },
        {
            arr: Object.values(chatResponse.action_items),
            header: "Potential Action Items",
            itemType: "to_do",
        },
        {
            arr: Object.values(chatResponse.follow_up),
            header: "Follow-Up Questions",
            itemType: "bulleted_list_item",
        },
        {
            arr: Object.values(chatResponse.arguments),
            header: "Arguments and Areas for Improvement",
            itemType: "bulleted_list_item",
        },
        {
            arr: Object.values(chatResponse.related_topics),
            header: "Related Topics",
            itemType: "bulleted_list_item",
        },
    ];

    for (let section of sections) {
        const infoHeader = {
            heading_2: {
                rich_text: [
                    {
                        text: {
                            content: section.header,
                        },
                    },
                ],
            },
        };
        data.children.push(infoHeader);

        if (section.header.includes("Arguments")) {
            const argWarning = {
                callout: {
                    rich_text: [
                        {
                            text: {
                                content:
                                    "These are potential arguments and rebuttals that other people may bring up in response to the covered topics. Like every other part of this summary document, factual accuracy is not guaranteed.",
                            },
                        },
                    ],
                    icon: {
                        emoji: "⚠️",
                    },
                    color: "orange_background",
                },
            };

            data.children.push(argWarning);
        }

        for (let item of section.arr) {
            const infoBlock = {
                [section.itemType]: {
                    rich_text: [
                        {
                            text: {
                                content: item,
                            },
                        },
                    ],
                },
            };

            data.children.push(infoBlock);
        }
    }

    const response = await notion.blocks.children.append(data);
    return response
}
import { jsonrepair } from "jsonrepair";

export function repairJSON(input) {
    let jsonObj;
    try {
        jsonObj = JSON.parse(input);
        console.log(`JSON repair not needed.`);
        return jsonObj;
    } catch (error) {
        try {
            console.log(`Encountered an error: ${error}. Attempting JSON repair...`);
            const cleanedJsonString = jsonrepair(input);
            jsonObj = JSON.parse(cleanedJsonString);
            console.log(`JSON repair successful.`);
            return jsonObj;
        } catch (error) {
            console.log(
                `First JSON repair attempt failed with error: ${error}. Attempting more involved JSON repair...`
            );
            try {
                const beginningIndex = Math.min(
                    input.indexOf("{") !== -1 ? input.indexOf("{") : Infinity,
                    input.indexOf("[") !== -1 ? input.indexOf("[") : Infinity
                );
                const endingIndex = Math.max(
                    input.lastIndexOf("}") !== -1 ? input.lastIndexOf("}") : -Infinity,
                    input.lastIndexOf("]") !== -1 ? input.lastIndexOf("]") : -Infinity
                );

                if (beginningIndex == Infinity || endingIndex == -1) {
                    throw new Error("No JSON object or array found (in repairJSON).");
                }

                const cleanedJsonString = jsonrepair(
                    input.substring(beginningIndex, endingIndex + 1)
                );
                jsonObj = JSON.parse(cleanedJsonString);
                console.log(`2nd-stage JSON repair successful.`);
                return jsonObj;
            } catch (error) {
                throw new Error(
                    `Recieved invalid JSON from AI model. All JSON repair efforts failed.`
                );
            }
        }
    }
}
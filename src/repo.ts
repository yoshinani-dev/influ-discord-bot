import type { Client as NotionClient } from "@notionhq/client";
import * as v from "valibot";

// NOTE: DiscordのIDは数値ではあるが18桁もあるため
// numberとして扱うと末尾の数桁が切り捨てられる
// そのためstringとして扱う

const DiscordIdSchema = v.pipe(
	v.string(),
	v.minLength(17),
	v.maxLength(19),
	v.regex(/^\d+$/),
);

export async function getDiscordUserIdByNotionUserId(
	notion: NotionClient,
	memberDatabaseId: string,
	notionUserId: string,
): Promise<string | undefined> {
	const users = await notion.databases.query({
		database_id: memberDatabaseId,
		page_size: 2,
		// NOTE: プロパティ数が多い場合はプロパティのidを指定する
		// filter_properties: ["%5D%3A%7Dl"],
		filter: {
			property: "ユーザー",
			people: {
				contains: notionUserId,
			},
		},
	});

	if (users.results.length !== 1) {
		console.warn(`Notion user ${notionUserId} expected 1 user, got 2`);
	}

	const result = users.results[0];
	if (!result || result.object !== "page" || !("properties" in result)) return;

	const discordIdProperty = result.properties["Discord ID"];
	if (!discordIdProperty) return;
	if (discordIdProperty.type !== "rich_text") {
		console.warn(`Notion Database Property "Discord ID" is not rich_text`);
		return;
	}

	const discordId = discordIdProperty.rich_text[0]?.plain_text;
	if (!discordId) return;

	const discordIdResult = v.safeParse(DiscordIdSchema, discordId);
	if (!discordIdResult.success) {
		console.warn(
			`Notion user ${notionUserId} Discord ID is not a number. reason: ${discordIdResult.issues.map((i) => i.message).join(", ")}`,
		);
		return;
	}

	return discordId;
}

import { failedApiCall, initTestDb, signup, successfulApiCall } from '../utils.js';

process.env.NODE_ENV = 'test';

import type * as misskey from 'misskey-js';

describe('Notification', () => {
	let root: misskey.entities.SignupResponse;
	let alice: misskey.entities.SignupResponse;

	beforeAll(async () => {
		root = await signup({ username: 'root' });
		alice = await signup({ username: 'alice' });
	}, 1000 * 60 * 2);

	describe('ロールがアサインされてからロールが消されるとバグる', async () => {
		// FIXME: https://misskey.hinasense.jp/notes/9xswbde7qahl008f
		// 1. ロールを作る
		const role = await successfulApiCall({
			endpoint: 'admin/roles/create',
			parameters: {
				name: 'Example Role',
				description: 'Example Role, to be deleted afterwards',
				color: null,
				iconUrl: null,
				target: 'manual',
				condFormula: {},
				isAdministrator: false,
				isModerator: false,
				isPublic: false,
				isExplorable: false,
				asBadge: false,
			},
			user: root,
		});

		// 2. ロールをアサインする
		await successfulApiCall({
			endpoint: 'admin/roles/assign',
			parameters: {
				roleId: role.id,
				userId: alice.id,
			},
			user: root,
		});

		// 3. ロールを消す
		await successfulApiCall({
			endpoint: 'admin/roles/delete',
			parameters: {
				roleId: role.id,
			},
			user: root,
		});

		// 4. 2でアサインしたユーザーの通知を見る
		// 5. 4のステータスコートが500になっていることを確認する
		await failedApiCall({
			endpoint: 'i/notifications',
			parameters: {},
			user: alice,
		}, {
			status: 500,
			code: '???',
			id: '??? (uuid v4)'
		});

		// 6. 2でアサインしたユーザーの通知をクリアする
		await successfulApiCall({
			endpoint: 'notifications/flush',
			parameters: {},
			user: alice,
		});

		// 7. 再度通知を取得した時500にならないことを確認する
		await successfulApiCall({
			endpoint: 'notifications/flush',
			parameters: {},
			user: alice,
		})
	});
});

export default {
	// 处理 HTTP 请求
	async fetch(request, env, ctx) {
		return handleCronJob(env, false)
	},

	// 处理 Cron 定时任务
	async scheduled(event, env, ctx) {
		ctx.waitUntil(handleCronJob(env, true));
	},
};

// Cron 任务逻辑
async function handleCronJob(env, cronJob) {
	let appIDs = env.APP.split(',')
	let haveDis = []
	let noDis = []

	for (const appID of appIDs) {
		let data = await (await fetch(`https://store.steampowered.com/api/appdetails?appids=${appID}&cc=cn&l=schinese`, {
			method: "GET",
			headers: { "Content-Type": "application/json" }
		})).json();

		let finalPrice = data[appID].data.price_overview.final / 100
		let initialPrice = data[appID].data.price_overview.initial / 100
		let percent = data[appID].data.price_overview.discount_percent
		let name = data[appID].data.name

		if (percent !== 0) {
			haveDis.push({name, initialPrice, finalPrice, percent})
		}else {
			noDis.push({name, initialPrice, finalPrice, percent})
		}
		console.log(name);
	}

	let pData
	if (haveDis.length !== 0) {
		let text = '# [降价产品]'

		for (const _ of haveDis) {
			text += `\r\r### ${_.name} -${_.percent}%\r\r原价:${_.initialPrice}￥ 现价:**${_.finalPrice}￥**`
		}

		if (noDis.length !== 0) {
			text += '\r\r# [未降价产品]'

			for (const _ of noDis) {
				text += `\r\r### ${_.name} ${_.initialPrice}￥`
			}
		}

		pData = {
			"markdown": {
				"text": text,
				"title": "有产品降价"
			},
			"msgtype": "markdown"
		}
	}else {
		let text = '# [没有产品降价]'

		for (const _ of noDis) {
			text += `\r\r### ${_.name} ${_.initialPrice}￥`
		}

		pData = {
			"markdown": {
				"text": text,
				"title": "今日无降价"
			},
			"msgtype": "markdown"
		}
	}


	if (cronJob === true) {
		await fetch(`https://oapi.dingtalk.com/robot/send?access_token=${env.TOKEN}`, {
			method: 'POST',
			body: JSON.stringify(pData),
			headers: {
				"Content-Type": "application/json"
			}
		})
	}else {
		return new Response(renderMarkdown(pData.markdown.text), {
			headers: {
				"Content-Type": "text/html"
			},
		});
	}

}


function renderMarkdown(markdown) {
// 替换标题
	let html = markdown
		.replace(/^#\s*\[(.*?)\]/gm, '<h1>$1</h1>')
		.replace(/^###\s*(.*?)(\s*[\r\n]|$)/gm, '<h3>$1</h3>');

	// 替换加粗文本
	html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

	// 替换换行符为段落
	html = html.replace(/\r\r/g, '</p><p>');

	// 添加服务提示

	html = 'Steam价格追踪正在运行......' + html

	return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Steam价格追踪</title></head><body>${html}</body></html>`;
}


/**
 * 本文件由 `npm run sync`（或网页端「生成手环安装包」）生成，请勿手改。
 *
 * 小米手环 10 的快应用不支持联网（官方支持表：system.fetch / system.request /
 * system.network 一律「不支持」），所以课表和学期设置在打包前拉取一次，
 * 作为静态数据随安装包带进手环。
 *
 * 仓库里这份是空模板：各人的课表不同，跑一次同步就会覆盖它（该文件带个人
 * 数据，是否提交由你自己决定）。
 */
export default {
  "synced_at": "",
  "account": "",
  "timetable": {
    "settings": {},
    "courses": []
  }
}

测试脚本说明
============
realsim.mjs  —— 真人操作复刻（最严格），27 项，覆盖 10 个真实场景：
   1 工作日开市浏览        2 点进点出一致性
   3 收市 20 分钟判休市    4 服务端 Cron 独立确认
   5 手机全新会话首屏休市  6 电脑最小化很久切回
   7 手机切后台再回来      8 三品种分开判定
   9 恢复开市             10 断线≠休市

其余脚本：ssrtruth / wakeflash / test_cf / mktcron / weeksim / weeksim2 /
         beatcore / firstfail / test_providers / stickytest / apitest /
         navtest / kvtest / bursttest / buildcheck

跑法：node realsim.mjs   （退出码 0 = 全过）

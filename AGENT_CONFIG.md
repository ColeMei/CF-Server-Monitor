# 探针动态配置协议

生产探针在指标上报请求中携带：

```text
X-Agent-Config-Schema: 3
X-Agent-Config-Md5: <最后成功应用的配置 MD5，首次为 none>
```

服务端对以下规范配置串计算 MD5；字段顺序、大小写和分隔符不可改变：

```text
collect_interval=0&report_interval=60&reset_day=1&schema_version=3&latency_profile=melbourne-global-v1&latency_targets=mel:s3.ap-southeast-4.amazonaws.com:443,mys:s3.ap-southeast-5.amazonaws.com:443,tyo:s3.ap-northeast-1.amazonaws.com:443,usw:s3.us-west-2.amazonaws.com:443,cn:oss-cn-beijing.aliyuncs.com:443
```

响应规则：

- MD5 一致：返回 `204 No Content`。
- MD5 不一致：返回 `200 application/x-www-form-urlencoded`，响应体为完整规范配置串，并通过 `X-Agent-Config-Md5` 返回新 MD5。

客户端必须整体校验配置：

- `collect_interval` 只能是 `0/1/2/5/10`。
- `report_interval` 只能是 `30/60/120/180`，且不能小于采集间隔。
- `reset_day` 必须为 `0..31` 的整数。
- `schema_version` 必须等于 `3`。
- `latency_profile` 必须是安全的 profile ID。
- `latency_targets` 是逗号分隔的 `key:host:port`；key 唯一，host 和端口必须合法。
- 响应体不得超过 1024 字节，不接受百分号编码、空格或换行。

客户端只有在完整校验和原子持久化均成功后才保存新 MD5。失败时继续使用旧配置和旧 MD5，以便下次上报重新获取。

动态配置不包含 `server_id`、`secret`、`worker_url`、调试开关或任何命令类字段。服务端可在配置体末尾附加一次性的 `rx_correction` / `tx_correction`。延迟结果通过 `latency_profile` 和 `latency` 对象上报，不存在运营商兼容字段。

# 可移植 MariaDB 放这里

将解压后的 MariaDB 可移植版放到这个目录，保持如下结构：

```
resources/mariadb/
  bin/mariadbd.exe
  bin/mariadb-install-db.exe
```

若没有打进来，主进程会回退到环境变量 `DATABASE_URL` 指定的外部 MySQL。

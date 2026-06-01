from __future__ import annotations

import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "content.db"

SECTION_PAGE_DATA = {
    "Java基础": [
        {
            "title": "Java 中 == 和 equals 的区别是什么？",
            "question": "从引用比较、值比较和常见面试陷阱来说明。",
            "answer": "基本类型用 == 比较值；引用类型的 == 比较地址。equals 默认继承自 Object 时也是比较地址，很多类例如 String、Integer、集合等都会重写 equals 来比较内容。面试里最容易出错的是把字符串、包装类和自定义对象混在一起说。",
        },
        {
            "title": "ArrayList 和 LinkedList 的核心区别是什么？",
            "question": "从底层结构、随机访问、插入删除和适用场景回答。",
            "answer": "ArrayList 底层是动态数组，随机访问快，尾部追加性能好；LinkedList 底层是双向链表，中间插入删除在已知节点位置时更方便，但随机访问慢。实际开发大多数场景优先 ArrayList。",
        },
        {
            "title": "HashMap 的底层结构是什么？",
            "question": "按 JDK 8 之后的实现说明数组、链表、红黑树之间的关系。",
            "answer": "HashMap 底层是数组 + 链表 + 红黑树。元素先按 hash 定位到桶位，冲突较少时用链表存，冲突较多并达到阈值时树化成红黑树，以降低极端情况下的查找复杂度。",
        },
        {
            "title": "泛型为什么能提高代码安全性？",
            "question": "解释编译期检查、类型擦除以及使用上的收益。",
            "answer": "泛型的核心价值是把类型错误提前到编译期发现，减少运行期 ClassCastException。Java 泛型通过类型擦除实现，运行后大部分泛型信息被擦除，但编译器会在编译阶段帮我们补充检查和类型转换。",
        },
    ],
    "JVM": [
        {
            "title": "JVM 内存区域有哪些？",
            "question": "从线程私有和线程共享角度梳理。",
            "answer": "线程私有包括程序计数器、虚拟机栈、本地方法栈；线程共享包括堆和方法区。面试里最常追问的是对象主要分配在堆中、栈帧随方法调用入栈出栈、元空间替代了永久代。",
        },
        {
            "title": "对象什么时候进入老年代？",
            "question": "结合 Minor GC、年龄判定和大对象规则回答。",
            "answer": "对象通常先进入 Eden，经历多次 Minor GC 后年龄达到阈值会晋升到老年代。大对象也可能直接进入老年代。具体阈值和分配担保策略会受到垃圾收集器和参数配置影响。",
        },
        {
            "title": "常见 GC 算法有哪些？",
            "question": "简要说明标记清除、复制、标记整理。",
            "answer": "标记清除实现简单但会产生碎片；复制算法适合对象存活率低的区域，速度快但空间利用率低；标记整理适合老年代，在回收后会整理出连续空间。不同收集器会组合使用这些思想。",
        },
        {
            "title": "类加载过程分哪几步？",
            "question": "按加载到初始化的顺序概括。",
            "answer": "类加载一般分为加载、验证、准备、解析、初始化。准备阶段给静态变量分配空间并设默认值，初始化阶段才执行静态赋值和静态代码块。",
        },
    ],
    "JUC": [
        {
            "title": "synchronized 和 ReentrantLock 的区别是什么？",
            "question": "从使用方式、可中断、可公平和条件队列说明。",
            "answer": "synchronized 是 JVM 层面的关键字，使用简单；ReentrantLock 是显式锁，支持可中断、公平锁、尝试获取锁和多个 Condition。需要更灵活控制时常选 ReentrantLock。",
        },
        {
            "title": "线程池的核心参数有哪些？",
            "question": "重点讲 corePoolSize、maximumPoolSize、workQueue。",
            "answer": "核心线程数决定常驻线程数量，最大线程数决定峰值扩容能力，阻塞队列决定任务缓存方式，拒绝策略决定线程池撑满后的处理方式。线程池调优本质上是在吞吐、延迟和资源占用之间做权衡。",
        },
        {
            "title": "volatile 能保证什么？",
            "question": "区分可见性、有序性和原子性。",
            "answer": "volatile 保证可见性和一定程度上的有序性，不能保证复合操作原子性。像 i++ 这种读改写组合仍然会有并发问题。",
        },
        {
            "title": "AQS 是什么？",
            "question": "简要说明它和锁、同步器的关系。",
            "answer": "AQS 是 Java 并发包里非常核心的同步框架，很多锁和同步器都基于它实现。它通过一个 state 状态位和 FIFO 等待队列来协调线程竞争。",
        },
    ],
    "mysql": [
        {
            "title": "MySQL 索引为什么能加快查询？",
            "question": "从有序结构、减少扫描和回表说清楚。",
            "answer": "索引本质上是帮助数据库缩小查找范围的有序数据结构。MySQL InnoDB 常用 B+ 树索引，通过有序性快速定位数据范围，减少全表扫描。使用二级索引时如果查询列不全，还可能发生回表。",
        },
        {
            "title": "事务的四大特性是什么？",
            "question": "按 ACID 展开。",
            "answer": "事务四大特性是原子性、一致性、隔离性和持久性。面试中通常还会顺着追问隔离级别、MVCC 和 undo log / redo log。",
        },
        {
            "title": "什么是最左前缀原则？",
            "question": "以联合索引为例说明。",
            "answer": "联合索引从最左列开始生效，查询条件如果跳过最左列，索引命中能力会明显下降。常见优化就是根据高频查询条件顺序设计联合索引。",
        },
        {
            "title": "MVCC 解决了什么问题？",
            "question": "从读写并发和一致性读角度回答。",
            "answer": "MVCC 主要用来提高并发下的读性能，让普通读操作尽量不阻塞写。它结合 undo log、版本链和 Read View 实现一致性读。",
        },
    ],
    "redis": [
        {
            "title": "Redis 为什么快？",
            "question": "从内存、单线程模型和数据结构角度概括。",
            "answer": "Redis 快主要因为基于内存、数据结构高效、网络 IO 开销低，而且核心命令执行路径短。它并不是简单“单线程所以快”，而是整体模型做到了极轻量。",
        },
        {
            "title": "Redis 常见数据结构有哪些？",
            "question": "说明字符串、哈希、列表、集合、有序集合的使用场景。",
            "answer": "字符串适合缓存对象或计数；哈希适合存对象字段；列表适合消息流；集合适合去重；有序集合适合排行榜。面试里经常会追问底层编码转换。",
        },
        {
            "title": "缓存穿透、击穿、雪崩分别是什么？",
            "question": "要求能区分三者并给出常见解决方案。",
            "answer": "穿透是查不存在的数据，可用布隆过滤器或空值缓存；击穿是热点 key 失效瞬间并发打到数据库，可用互斥锁或逻辑过期；雪崩是大量 key 同时失效，可用过期时间打散和多级缓存。",
        },
        {
            "title": "Redis 持久化方式有哪些？",
            "question": "对比 RDB 和 AOF。",
            "answer": "RDB 更适合定期快照，恢复快但可能丢失最近数据；AOF 记录写命令，数据更完整但文件更大。很多场景会混合使用。",
        },
    ],
    "OS": [
        {
            "title": "进程和线程的区别是什么？",
            "question": "从资源分配和调度单位两个角度回答。",
            "answer": "进程是资源分配的基本单位，线程是 CPU 调度的基本单位。一个进程可以有多个线程，线程共享进程资源，但切换和隔离成本低于进程。",
        },
        {
            "title": "用户态和内核态有什么区别？",
            "question": "说明权限差异和切换成本。",
            "answer": "用户态权限低，不能直接执行特权指令；内核态权限高，可以访问底层硬件资源。系统调用、异常和中断都可能触发用户态到内核态切换。",
        },
        {
            "title": "什么是死锁？",
            "question": "要能说出条件和处理方式。",
            "answer": "死锁是多个线程或进程相互等待资源，导致永久阻塞。必要条件包括互斥、请求并保持、不可剥夺、循环等待。处理上可以预防、避免、检测和解除。",
        },
        {
            "title": "页式存储和虚拟内存有什么作用？",
            "question": "从空间隔离和内存利用率来回答。",
            "answer": "虚拟内存让每个进程看到独立的地址空间，提高了安全性和编程便利性。分页机制则把地址映射到物理内存页框，实现更灵活的内存管理。",
        },
    ],
    "计网": [
        {
            "title": "TCP 和 UDP 的区别是什么？",
            "question": "从连接、可靠性、顺序性和使用场景讲清楚。",
            "answer": "TCP 面向连接、可靠、按序到达，适合对稳定性要求高的场景；UDP 无连接、开销小、时延低，适合音视频、广播等更在意实时性的场景。",
        },
        {
            "title": "TCP 三次握手为什么不是两次？",
            "question": "说明双方收发能力确认的必要性。",
            "answer": "三次握手是为了让双方都确认彼此的发送和接收能力正常。如果只有两次，服务端无法确认客户端是否收到了自己的响应，也会带来历史连接请求的问题。",
        },
        {
            "title": "HTTPS 比 HTTP 多了什么？",
            "question": "从加密、证书、握手流程说明。",
            "answer": "HTTPS 在 HTTP 之上加入 TLS，提供加密传输、身份认证和完整性校验。建立连接时会先进行 TLS 握手，再传输业务数据。",
        },
        {
            "title": "Cookie、Session、Token 分别怎么理解？",
            "question": "从状态保存位置和常见认证场景回答。",
            "answer": "Cookie 是浏览器端保存的小数据；Session 多在服务端保存会话状态；Token 常用于前后端分离场景，由客户端携带，服务端校验。它们本质上解决的是状态保持和身份认证问题。",
        },
    ],
    "linux": [
        {
            "title": "Linux 排查线上问题通常怎么开始？",
            "question": "给出一套常见排查顺序。",
            "answer": "通常先看机器资源，再看进程状态和日志，然后结合网络连接、磁盘 IO、线程栈等继续定位。面试里比起记命令，更重要的是排查思路的完整性。",
        },
        {
            "title": "top、ps、grep、tail 这些命令分别用来做什么？",
            "question": "按使用场景解释。",
            "answer": "top 看整体资源占用；ps 看进程列表；grep 做文本过滤；tail 常用来看日志末尾并结合 -f 实时追踪。它们是最常见的一组排查组合。",
        },
        {
            "title": "如何查看端口占用？",
            "question": "说出常用命令及思路。",
            "answer": "常见做法是用 lsof -i、netstat 或 ss 查看指定端口被哪个进程占用，再结合 ps 和日志继续定位。重点不是死记命令，而是知道先查谁占用、再查为什么。",
        },
        {
            "title": "chmod 和 chown 的区别是什么？",
            "question": "一个改权限，一个改归属。",
            "answer": "chmod 修改文件权限位；chown 修改文件所属用户和用户组。这两个命令在线上部署、脚本执行和目录共享时非常常见。",
        },
    ],
    "ai": [
        {
            "title": "AI 在求职中可以怎么帮助你？",
            "question": "从学习、总结、模拟面试和提效角度回答。",
            "answer": "AI 可以帮你整理知识框架、压缩信息密度、模拟问答、优化表达和辅助写代码。真正的价值不是替你背答案，而是帮你更快形成自己的理解。",
        },
        {
            "title": "提示词应该怎么写得更有效？",
            "question": "给出简单的结构模板。",
            "answer": "高质量提示词通常会明确背景、目标、约束和输出格式。比起一句模糊需求，结构化提示词更容易得到稳定结果。",
        },
        {
            "title": "使用 AI 时最容易踩的坑是什么？",
            "question": "从幻觉、时效性和验证成本回答。",
            "answer": "最常见的问题是把 AI 输出当成绝对正确。涉及代码、面试知识、时效信息时，一定要做二次验证，尤其是底层原理和规范细节。",
        },
        {
            "title": "AI 工具如何融入日常学习流程？",
            "question": "描述一个简单闭环。",
            "answer": "比较实用的方式是：先自己整理问题，再让 AI 帮你补漏洞，最后再回到自己的笔记里重构答案。这样不会过度依赖，也更容易形成长期记忆。",
        },
    ],
}


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS section_items (
            section_key TEXT NOT NULL,
            item_order INTEGER NOT NULL,
            title TEXT NOT NULL,
            question TEXT NOT NULL DEFAULT '',
            answer TEXT NOT NULL DEFAULT '',
            PRIMARY KEY (section_key, item_order)
        )
        """
    )
    conn.execute("DELETE FROM section_items")

    for section_key, items in SECTION_PAGE_DATA.items():
        for index, item in enumerate(items):
            conn.execute(
                """
                INSERT INTO section_items (section_key, item_order, title, question, answer)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    section_key,
                    index,
                    item["title"],
                    item.get("question", ""),
                    item.get("answer", ""),
                ),
            )

    conn.commit()
    conn.close()
    print("Imported section_items into content.db")


if __name__ == "__main__":
    main()

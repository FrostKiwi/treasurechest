---
wip: true
title: Can't block me - Tunneling corporate firewalls for developers
permalink: "/{{ page.fileSlug }}/"
date:
last_modified:
description:
publicTags:
  - cyber security
  - networking
  - hacking
image:
---
Today's com

Being able to setup a connection you trust and where your dev tools work is important. 

If you control both Source and Destination, then you can tunnel everything through anything in complete secrecy and there is nothing anyone can do about it. This shouldn't be news to anyone working with networks. There are countless articles and videos going over a multitude of tunneling combinations.

- Internet over Pings

But ultimately, this post is about how to do it in a way that your dev tools are happy about.

OpenSSH, as comes preinstalled on Windows these days, doesn't support proxies natively, [except an SSH proxy itself](https://goteleport.com/blog/ssh-proxyjump-ssh-proxycommand/). Instead, OpenSSH gives the generic [`ProxyCommand`]

Rsync hates you
Needs the ssh it comes with. You could specify the command via -e or the environment var `RSYNC_RSH`, but it doesn't get you far, as the way cwRsync ships, it won't work as it invokes the ProxyCommand in an incompatible way. /bin/sh not found, but if you give it that it has to use the libraries it was compiled with, which we don't have.

So we need to give it's own ssh, but we lose the ability to run config, unless we install MSYS to provide that functionality. So it's back to specifying our proxycommand as a long tail of commands. 

`C:\msysMinimal\usr\bin\rsync.exe -e "/C/msysMinimal/usr/bin/ssh-for-rsync.exe -i /C/Users/artsimow/.ssh/key -o StrictHostKeyChecking=accept-new -o ProxyCommand='/C/msysMinimal/usr/bin/proxytunnel -X -z -p 127.0.0.1:54450 -r domain.com:443 -d 127.0.0.1:22'"`

Alternative:
https://github.com/erebe/wstunnel

You can use
https://github.com/butlerx/wetty or https://github.com/shellinabox/shellinabox , but exposing the shell on as a website is not the best idea, as HTTPS itself may be compromised in a corporate environment due to DPI.

## Other options
There is the connection multiplexer [https://github.com/yrutschle/sslh](SSLH), which can sit in front of your HTTP server and redirect the packets based on type. However, such a modification of infrastructure may simply be impossible and doesn't solve the issue of SSH connections being potentially filtered. It remains a popular choice for many.

<blockquote class="reaction"><div class="reaction_text">Man, I have seen some s*#$.</div><img class="kiwi" src="/assets/kiwis/tired.svg"></blockquote>
<a></a>

<blockquote class="reaction"><div class="reaction_text">As much as any other post, my blog's <a target="_blank" href="/about/#disclaimer">disclaimer</a> applies.</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>
<a></a>


There are many ways to build your tunnel. Over ICMP.

## Filtered

| Direction | Protocol | Length | Info |
| --- | --- | --- | --- |
| Source→Target	|TCP	|66	|`52170 → 22 [SYN] Seq=0 Win=64240 Len=0 MSS=1460 WS=256 SACK_PERM`|
| Target→Source	|TCP	|66	|`22 → 52170 [SYN, ACK] Seq=0 Ack=1 Win=64240 Len=0 MSS=1452 SACK_PERM WS=128`|
| Source→Target	|TCP	|54	|`52170 → 22 [ACK] Seq=1 Ack=1 Win=132096 Len=0`|
| Source→Target	|TCP	|87	|`52170 → 22 [PSH, ACK] Seq=1 Ack=1 Win=132096 Len=33`|
| Source→Target	|TCP	|87	|`[TCP Retransmission] 52170 → 22 [PSH, ACK] Seq=1 Ack=1 Win=132096 Len=33`|
| Source→Target	|TCP	|87	|`[TCP Retransmission] 52170 → 22 [PSH, ACK] Seq=1 Ack=1 Win=132096 Len=33`|
| Source→Target	|TCP	|87	|`[TCP Retransmission] 52170 → 22 [PSH, ACK] Seq=1 Ack=1 Win=132096 Len=33`|
| Source→Target	|TCP	|87	|`[TCP Retransmission] 52170 → 22 [PSH, ACK] Seq=1 Ack=1 Win=132096 Len=33`|
| Source→Target	|TCP	|87	|`[TCP Retransmission] 52170 → 22 [PSH, ACK] Seq=1 Ack=1 Win=132096 Len=33`|
| Source→Target	|TCP	|87	|`[TCP Retransmission] 52170 → 22 [PSH, ACK] Seq=1 Ack=1 Win=132096 Len=33`|
| Source→Target	|TCP	|87	|`[TCP Retransmission] 52170 → 22 [PSH, ACK] Seq=1 Ack=1 Win=132096 Len=33`|
| Source→Target	|TCP	|87	|`[TCP Retransmission] 52170 → 22 [PSH, ACK] Seq=1 Ack=1 Win=132096 Len=33`|
| Source→Target	|TCP	|54	|`52170 → 22 [RST, ACK] Seq=34 Ack=1 Win=0 Len=0`|

## Whitelisted

| Direction | Protocol | Length | Info |
| --- | --- | --- | --- |
|Source→Target|	TCP|	66|	`52789 → 22 [SYN] Seq=0 Win=64240 Len=0 MSS=1460 WS=256 SACK_PERM`|
|Target→Source|	TCP|	66|	`22 → 52789 [SYN, ACK] Seq=0 Ack=1 Win=64240 Len=0 MSS=1460 SACK_PERM WS=128`|
|Source→Target|	TCP|	54|	`52789 → 22 [ACK] Seq=1 Ack=1 Win=131328 Len=0`|
|Source→Target|	SSHv2|	87|	`Client: Protocol (SSH-2.0-OpenSSH_for_Windows_9.5)`|
|Target→Source|	TCP|	60|	`22 → 52789 [ACK] Seq=1 Ack=34 Win=64256 Len=0`|
|Target→Source|	SSHv2|	95|	`Server: Protocol (SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.9)`|
|Source→Target|	SSHv2|	1486|	`Client: Key Exchange Init`|
|Target→Source|	SSHv2|	1110|	`Server: Key Exchange Init`|
|Source→Target|	SSHv2|	102|	`Client: Elliptic Curve Diffie-Hellman Key Exchange Init`|
|Target→Source|	TCP|	60|	`22 → 52789 [ACK] Seq=1098 Ack=1514 Win=64128 Len=0`|
|Target→Source|	SSHv2|	562|	`Server: Elliptic Curve Diffie-Hellman Key Exchange Reply, New Keys, Encrypted packet (len=228)`|
|Source→Target|	SSHv2|	70|	`Client: New Keys`|
|Target→Source|	TCP|	60|	`22 → 52789 [ACK] Seq=1606 Ack=1530 Win=64128 Len=0`|
|Source→Target|	SSHv2|	98|	`Client: Encrypted packet (len=44)`|
|Target→Source|	TCP|	60|	`22 → 52789 [ACK] Seq=1606 Ack=1574 Win=64128 Len=0`|
|Target→Source|	SSHv2|	98|	`Server: Encrypted packet (len=44)`|
|Source→Target|	SSHv2|	114|	`Client: Encrypted packet (len=60)`|
|Target→Source|	TCP|	60|	`22 → 52789 [ACK] Seq=1650 Ack=1634 Win=64128 Len=0`|
|Target→Source|	SSHv2|	98|	`Server: Encrypted packet (len=44)`|
|Source→Target|	SSHv2|	554|	`Client: Encrypted packet (len=500)`|
|Target→Source|	TCP|	60|	`22 → 52789 [ACK] Seq=1694 Ack=2134 Win=64128 Len=0`|
|Target→Source|	SSHv2|	514|	`Server: Encrypted packet (len=460)`|
|Source→Target|	SSHv2|	962|	`Client: Encrypted packet (len=908)`|
|Target→Source|	SSHv2|	82|	`Server: Encrypted packet (len=28)`|
|Source→Target|	SSHv2|	166|	`Client: Encrypted packet (len=112)`|
|Target→Source|	TCP|	60|	`22 → 52789 [ACK] Seq=2182 Ack=3154 Win=64128 Len=0`|
|Target→Source|	SSHv2|	830|	`Server: Encrypted packet (len=776)`|
|Source→Target|	TCP|	54|	`52789 → 22 [ACK] Seq=3154 Ack=2958 Win=130048 Len=0`|
|Target→Source|	SSHv2|	246|	`Server: Encrypted packet (len=192)`|
|Source→Target|	SSHv2|	190|	`Client: Encrypted packet (len=136)`|
|Target→Source|	TCP|	60|	`22 → 52789 [ACK] Seq=3150 Ack=3290 Win=64128 Len=0`|
|Target→Source|	SSHv2|	162|	`Server: Encrypted packet (len=108)`|
|Target→Source|	SSHv2|	242|	`Server: Encrypted packet (len=188)`|
|Target→Source|	SSHv2|	406|	`Server: Encrypted packet (len=352)`|
|Target→Source|	SSHv2|	170|	`Server: Encrypted packet (len=116)`|
|Target→Source|	SSHv2|	138|	`Server: Encrypted packet (len=84)`|
|Target→Source|	SSHv2|	274|	`Server: Encrypted packet (len=220)`|
|Target→Source|	SSHv2|	306|	`Server: Encrypted packet (len=252)`|
|Target→Source|	SSHv2|	146|	`Server: Encrypted packet (len=92)`|
|Target→Source|	SSHv2|	226|	`Server: Encrypted packet (len=172)`|
|Target→Source|	SSHv2|	146|	`Server: Encrypted packet (len=92)`|
|Source→Target|	TCP|	54|	`52789 → 22 [ACK] Seq=3290 Ack=4826 Win=131328 Len=0`|
|Target→Source|	SSHv2|	1514|	`Server: Encrypted packet (len=1460)`|
|Target→Source|	SSHv2|	86|	`Server: Encrypted packet (len=32)`|
|Source→Target|	TCP|	54|	`52789 → 22 [ACK] Seq=3290 Ack=6318 Win=131328 Len=0`|
|Target→Source|	SSHv2|	98|	`Server: Encrypted packet (len=44)`|
|Target→Source|	SSHv2|	130|	`Server: Encrypted packet (len=76)`|
|Source→Target|	TCP|	54|	`52789 → 22 [ACK] Seq=3290 Ack=6438 Win=131072 Len=0`|
|Target→Source|	SSHv2|	1514|	`Server: Encrypted packet (len=1460)`|
|Target→Source|	SSHv2|	62|	`Server: Encrypted packet (len=8)`|
|Target→Source|	SSHv2|	98|	`Server: Encrypted packet (len=44)`|
|Source→Target|	TCP|	54|	`52789 → 22 [ACK] Seq=3290 Ack=7950 Win=131328 Len=0`|
|Target→Source|	SSHv2|	98|	`Server: Encrypted packet (len=44)`|
|Target→Source|	SSHv2|	98|	`Server: Encrypted packet (len=44)`|
|Source→Target|	TCP|	54|	`52789 → 22 [ACK] Seq=3290 Ack=8038 Win=131072 Len=0`|

# Tunneled
## proxytunnel.exe
| Direction | Protocol | Length | Info |
| --- | --- | --- | --- |
|Source→Proxy|	TCP		|66|	`54033 → 80 [SYN] Seq=0 Win=64240 Len=0 MSS=1460 WS=256 SACK_PERM`|
|Proxy→Source|	TCP		|66|	`80 → 54033 [SYN, ACK] Seq=0 Ack=1 Win=29200 Len=0 MSS=1460 SACK_PERM WS=512`|
|Source→Proxy|	TCP		|54|	`54033 → 80 [ACK] Seq=1 Ack=1 Win=131328 Len=0`|
|Source→Proxy|	HTTP	|676|	`CONNECT TARGET:443 HTTP/1.1 `|
|Proxy→Source|	TCP		|60|	`80 → 54033 [ACK] Seq=1 Ack=623 Win=30720 Len=0`|
|Proxy→Source|	TCP		|1514|	`80 → 54033 [ACK] Seq=1 Ack=623 Win=30720 Len=1460`|
|Proxy→Source|	HTTP	|1148|	`HTTP/1.0 200 Connection established `|
|Source→Proxy|	TCP		|54|	`54033 → 80 [ACK] Seq=623 Ack=2555 Win=131328 Len=0`|
|Source→Proxy|	TLSv1.2	|376|	`Client Hello (SNI=TARGET)`|
|Proxy→Source|	TCP		|60|	`80 → 54033 [ACK] Seq=2555 Ack=945 Win=31744 Len=0`|
|Proxy→Source|	TLSv1.3	|1514|	`Server Hello, Change Cipher Spec, Application Data`|
|Proxy→Source|	TLSv1.3	|978|	`Application Data, Application Data, Application Data`|
|Source→Proxy|	TCP		|54|	`54033 → 80 [ACK] Seq=945 Ack=4939 Win=131328 Len=0`|
|Source→Proxy|	TLSv1.3	|134|	`Change Cipher Spec, Application Data`|
|Proxy→Source|	TCP		|60|	`80 → 54033 [ACK] Seq=4939 Ack=1025 Win=31744 Len=0`|
|Source→Proxy|	TLSv1.3	|165|	`Application Data`|
|Proxy→Source|	TCP		|60|	`80 → 54033 [ACK] Seq=4939 Ack=1136 Win=31744 Len=0`|
|Proxy→Source|	TLSv1.3	|336|	`Application Data, Application Data, Application Data, Application Data`|
|Source→Proxy|	TLSv1.3	|109|	`Application Data`|
|Proxy→Source|	TCP		|60|	`80 → 54033 [ACK] Seq=5221 Ack=1191 Win=31744 Len=0`|
|Source→Proxy|	TLSv1.3	|1508|	`Application Data`|
|Proxy→Source|	TCP		|60|	`80 → 54033 [ACK] Seq=5221 Ack=2645 Win=34816 Len=0`|
|Proxy→Source|	TLSv1.3	|772|	`Application Data`|
|Source→Proxy|	TLSv1.3	|124|	`Application Data`|
|Proxy→Source|	TCP		|60|	`80 → 54033 [ACK] Seq=5939 Ack=2715 Win=34816 Len=0`|
|Proxy→Source|	TLSv1.3	|568|	`Application Data`|
|Source→Proxy|	TLSv1.3	|136|	`Application Data`|
|Proxy→Source|	TCP		|60|	`80 → 54033 [ACK] Seq=6453 Ack=2797 Win=34816 Len=0`|
|Proxy→Source|	TLSv1.3	|120|	`Application Data`|
|Source→Proxy|	TLSv1.3	|136|	`Application Data`|
|Proxy→Source|	TCP		|60|	`80 → 54033 [ACK] Seq=6519 Ack=2879 Win=34816 Len=0`|
|Proxy→Source|	TLSv1.3	|120|	`Application Data`|
|Source→Proxy|	TLSv1.3	|216|	`Application Data`|
|Proxy→Source|	TCP		|60|	`80 → 54033 [ACK] Seq=6585 Ack=3041 Win=37888 Len=0`|
|Proxy→Source|	TLSv1.3	|176|	`Application Data`|
|Source→Proxy|	TCP		|54|	`54033 → 80 [ACK] Seq=3041 Ack=6707 Win=131072 Len=0`|
|Source→Proxy|	TLSv1.3	|384|	`Application Data`|
|Proxy→Source|	TCP		|60|	`80 → 54033 [ACK] Seq=6707 Ack=3371 Win=40448 Len=0`|
|Proxy→Source|	TLSv1.3	|104|	`Application Data`|
|Source→Proxy|	TLSv1.3	|188|	`Application Data`|
|Proxy→Source|	TCP		|60|	`80 → 54033 [ACK] Seq=6757 Ack=3505 Win=43520 Len=0`|
|Proxy→Source|	TLSv1.3	|1046|	`Application Data, Application Data`|
|Source→Proxy|	TCP		|54|	`54033 → 80 [ACK] Seq=3505 Ack=7749 Win=130048 Len=0`|
|Proxy→Source|	TLSv1.3	|120|	`Application Data`|
|Source→Proxy|	TLSv1.3	|212|	`Application Data`|
|Proxy→Source|	TCP		|60|	`80 → 54033 [ACK] Seq=7815 Ack=3663 Win=46592 Len=0`|
|Proxy→Source|	TLSv1.3	|298|	`Application Data, Application Data`|
|Source→Proxy|	TCP		|54|	`54033 → 80 [ACK] Seq=3663 Ack=8059 Win=131328 Len=0`|
|Proxy→Source|	TLSv1.3	|1514|	`Application Data`|
|Proxy→Source|	TLSv1.3	|378|	`Application Data, Application Data, Application Data`|
|Source→Proxy|	TCP		|54|	`54033 → 80 [ACK] Seq=3663 Ack=9843 Win=131328 Len=0`|

## Older `connect.exe`
| Direction | Protocol | Length | Info |
| --- | --- | --- | --- |
| Source→Proxy	|TCP|	66|	`53166 → 80 [SYN] Seq=0 Win=64240 Len=0 MSS=1460 WS=256 SACK_PERM`|
| Proxy→Source	|TCP|	66|	`80 → 53166 [SYN, ACK] Seq=0 Ack=1 Win=29200 Len=0 MSS=1460 SACK_PERM WS=512`|
| Source→Proxy	|TCP|	54|	`53166 → 80 [ACK] Seq=1 Ack=1 Win=131328 Len=0`|
| Source→Proxy	|HTTP|	650|	`CONNECT 87.187.210.102:44422 HTTP/1.0 `|
| Proxy→Source	|TCP|	60|	`80 → 53166 [ACK] Seq=1 Ack=597 Win=30720 Len=0`|
| Proxy→Source	|TCP|	1514|	`80 → 53166 [ACK] Seq=1 Ack=597 Win=30720 Len=1460 [TCP PDU reassembled in 20]`|
| Proxy→Source	|HTTP|	1148|	`HTTP/1.0 200 Connection established `|
| Source→Proxy	|TCP|	54|	`53166 → 80 [ACK] Seq=597 Ack=2555 Win=131328 Len=0`|
| Source→Proxy	|TCP|	87|	`53166 → 80 [PSH, ACK] Seq=597 Ack=2555 Win=131328 Len=33`|
| Proxy→Source	|TCP|	60|	`80 → 53166 [ACK] Seq=2555 Ack=630 Win=30720 Len=0`|
| Proxy→Source	|TCP|	75|	`80 → 53166 [PSH, ACK] Seq=2555 Ack=630 Win=30720 Len=21`|
| Source→Proxy	|TCP|	1078|	`53166 → 80 [PSH, ACK] Seq=630 Ack=2576 Win=131328 Len=1024`|
| Proxy→Source	|TCP|	60|	`80 → 53166 [ACK] Seq=2576 Ack=1654 Win=32768 Len=0`|
| Source→Proxy	|TCP|	462|	`53166 → 80 [PSH, ACK] Seq=1654 Ack=2576 Win=131328 Len=408`|
| Proxy→Source	|TCP|	60|	`80 → 53166 [ACK] Seq=2576 Ack=2062 Win=34816 Len=0`|
| Proxy→Source	|TCP|	750|	`80 → 53166 [PSH, ACK] Seq=2576 Ack=2062 Win=34816 Len=696`|
| Source→Proxy	|TCP|	102|	`53166 → 80 [PSH, ACK] Seq=2062 Ack=3272 Win=130560 Len=48`|
| Proxy→Source	|TCP|	60|	`80 → 53166 [ACK] Seq=3272 Ack=2110 Win=34816 Len=0`|
| Source→Proxy	|TCP|	54|	`65048 → 80 [FIN, ACK] Seq=1 Ack=1 Win=510 Len=0`|
| Proxy→Source	|TCP|	54|	`80 → 65048 [FIN, ACK] Seq=1 Ack=2 Win=69 Len=0`|
| Source→Proxy	|TCP|	54|	`65048 → 80 [ACK] Seq=2 Ack=2 Win=510 Len=0`|
| Proxy→Source	|TCP|	546|	`80 → 53166 [PSH, ACK] Seq=3272 Ack=2110 Win=34816 Len=492`|
| Source→Proxy	|TCP|	114|	`53166 → 80 [PSH, ACK] Seq=2110 Ack=3764 Win=130048 Len=60`|
| Proxy→Source	|TCP|	60|	`80 → 53166 [ACK] Seq=3764 Ack=2170 Win=34816 Len=0`|
| Proxy→Source	|TCP|	98|	`80 → 53166 [PSH, ACK] Seq=3764 Ack=2170 Win=34816 Len=44`|
| Source→Proxy	|TCP|	114|	`53166 → 80 [PSH, ACK] Seq=2170 Ack=3808 Win=130048 Len=60`|
| Proxy→Source	|TCP|	60|	`80 → 53166 [ACK] Seq=3808 Ack=2230 Win=34816 Len=0`|
| Proxy→Source	|TCP|	98|	`80 → 53166 [PSH, ACK] Seq=3808 Ack=2230 Win=34816 Len=44`|
| Source→Proxy	|TCP|	194|	`53166 → 80 [PSH, ACK] Seq=2230 Ack=3852 Win=130048 Len=140`|
| Proxy→Source	|TCP|	60|	`80 → 53166 [ACK] Seq=3852 Ack=2370 Win=36864 Len=0`|
| Proxy→Source	|TCP|	154|	`80 → 53166 [PSH, ACK] Seq=3852 Ack=2370 Win=36864 Len=100`|
| Source→Proxy	|TCP|	54|	`53166 → 80 [ACK] Seq=2370 Ack=3952 Win=129792 Len=0`|
| Source→Proxy	|TCP|	362|	`53166 → 80 [PSH, ACK] Seq=2370 Ack=3952 Win=129792 Len=308`|
| Proxy→Source	|TCP|	60|	`80 → 53166 [ACK] Seq=3952 Ack=2678 Win=38912 Len=0`|
| Proxy→Source	|TCP|	82|	`80 → 53166 [PSH, ACK] Seq=3952 Ack=2678 Win=38912 Len=28`|
| Source→Proxy	|TCP|	166|	`53166 → 80 [PSH, ACK] Seq=2678 Ack=3980 Win=129792 Len=112`|
| Proxy→Source	|TCP|	60|	`80 → 53166 [ACK] Seq=3980 Ack=2790 Win=38912 Len=0`|
| Source→Proxy	|TCP|	128|	`54033 → 80 [PSH, ACK] Seq=1 Ack=1 Win=510 Len=74`|
| Proxy→Source	|TCP|	60|	`80 → 54033 [ACK] Seq=1 Ack=75 Win=91 Len=0`|
| Proxy→Source	|TCP|	1002|	`80 → 53166 [PSH, ACK] Seq=3980 Ack=2790 Win=38912 Len=948`|
| Source→Proxy	|TCP|	54|	`53166 → 80 [ACK] Seq=2790 Ack=4928 Win=131328 Len=0`|
| Proxy→Source	|TCP|	104|	`80 → 54033 [PSH, ACK] Seq=1 Ack=75 Win=91 Len=50`|
| Source→Proxy	|TCP|	54|	`54033 → 80 [ACK] Seq=75 Ack=51 Win=510 Len=0`|
| Proxy→Source	|TCP|	98|	`80 → 53166 [PSH, ACK] Seq=4928 Ack=2790 Win=38912 Len=44`|
| Source→Proxy	|TCP|	190|	`53166 → 80 [PSH, ACK] Seq=2790 Ack=4972 Win=131328 Len=136`|
| Proxy→Source	|TCP|	60|	`80 → 53166 [ACK] Seq=4972 Ack=2926 Win=40960 Len=0`|
| Proxy→Source	|TCP|	254|	`80 → 53166 [PSH, ACK] Seq=4972 Ack=2926 Win=40960 Len=200`|
| Source→Proxy	|TCP|	54|	`53166 → 80 [ACK] Seq=2926 Ack=5172 Win=131072 Len=0`|
| Proxy→Source	|TCP|	194|	`80 → 53166 [PSH, ACK] Seq=5172 Ack=2926 Win=40960 Len=140`|
| Proxy→Source	|TCP|	1514|	`80 → 53166 [ACK] Seq=5312 Ack=2926 Win=40960 Len=1460`|
| Proxy→Source	|TCP|	150|	`80 → 53166 [PSH, ACK] Seq=6772 Ack=2926 Win=40960 Len=96`|
| Source→Proxy	|TCP|	54|	`53166 → 80 [ACK] Seq=2926 Ack=6868 Win=131328 Len=0`|

## Deep Packet Inspection
There is only one way to detect this properly: [Deep packet inspection](https://en.wikipedia.org/wiki/Deep_packet_inspection). In the context of HTTPs or corporate connections, this involved pre-installing a [Trusted Root Certification Authority](https://en.wikipedia.org/wiki/Certificate_authority) on the user's machine, which is stripped by the corporate proxy. But this is such a bad idea, that [even the NSA issued an advisory](https://web.archive.org/web/20191119195359/https://media.defense.gov/2019/Nov/18/2002212783/-1/-1/0/MANAGING%20RISK%20FROM%20TLS%20INSPECTION_20191106.PDF).
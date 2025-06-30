---
title: Tunneling SSH over HTTPS
permalink: "/{{ page.fileSlug }}/"
redirect_from: /tunneling-corporate-firewalls
date: 2025-03-27
last_modified: 2025-06-25
description: Establish SSH connections and ensure your dev tools work via HTTPS tunneling, even if proxies and firewalls won't let you
publicTags:
  - cyber security
  - web dev
  - dev ops
image: img/thumb.png
---
When you have a project, online service or WebApp that you manage and deploy, you usually have something that you [SSH](https://en.wikipedia.org/wiki/Secure_Shell) into. It maybe a real server, a [VPS](https://en.wikipedia.org/wiki/Virtual_private_server), a container, a [Kubernetes](https://kubernetes.io/) node and what have you.

<blockquote class="reaction"><div class="reaction_text">...unless your project is purely <a target="_blank" href="https://en.wikipedia.org/wiki/Serverless_computing">serverless</a> and built with a bunch of <a target="_blank" href="https://cloud.google.com/learn/paas-vs-iaas-vs-saas">(Insert Random Letter) as a Service</a> bricks.</div><img class="kiwi" src="/assets/kiwis/think.svg"></blockquote>

Being able to setup a connection you trust and where your dev tools work is important. How you connect to the server where you deploy your projects isn't always straight forward though, when there are proxies, packet sniffing firewalls and network monitoring in-between you, the internet and the target server.

<blockquote class="reaction"><div class="reaction_text">The <strong>correct</strong> answer is: <a target="_blank" href="https://tailscale.com/blog/hamachi">setup a VPN</a>! But that's sometimes not possible.</div><img class="kiwi" src="/assets/kiwis/facepalm.svg"></blockquote>

Ultimately, this is what the article is about - how to SSH into machines, when there is stuff in the way preventing that and make sure that your tools like [git](https://en.wikipedia.org/wiki/Git), [scp](https://man.openbsd.org/scp.1), [rsync](https://en.wikipedia.org/wiki/Rsync) or editing files directly on the server via [VSCode's SSH integration](https://code.visualstudio.com/docs/remote/ssh) work, with no new software installed and the ***absolute minimum*** of modifications to your server.

I find it *fascinating* what seemingly simple tools can do if you look closely. Did you know [Git for Windows](https://git-scm.com/downloads/win) comes with tunneling software, [whitelisted](https://www.virustotal.com/gui/file/ceb2fd60cd2bb94ce37c875ca502094208c2bfd04b96cde9a4f994f1d08a3318) by all Anti-Virus software? How do these tools interact with network security on a per-packet basis? Let's investigate! 🔍

## Tunneling - So many flavors
If you control both Source and Destination, then you can tunnel everything through anything in complete secrecy and ultimately there is nothing anyone can do about it. This shouldn't be news to anyone working with networks. There are countless articles and videos going over a multitude of tunneling combinations.

- [Internet and SSH over ICMP (Pings)](https://github.com/DhavalKapil/icmptunnel)
- [Internet and SSH over DNS requests](https://github.com/yarrick/iodine)
- [Internet and SSH over WebSockets](https://github.com/erebe/wstunnel)

As for this article, we'll deep-dive ✨***SSH over HTTP(S)***✨. Be it Linux, Mac or Windows, we will look at how to setup everything up, what the underlying network traffic looks like and most importantly: how your digital infrastructure is **already** capable of all this ... even if it wasn't supposed to.

## Basic SSH Connection Scenarios
We'll go through all the ways you may SSH into your server, with increasing levels of filtering, monitoring and connection blocking. Our context is web development, so how your main WebApps are reached is covered as well. Here, let's assume your WebApps are served or [reverse proxied](https://www.cloudflare.com/learning/cdn/glossary/reverse-proxy/) with [Nginx](https://en.wikipedia.org/wiki/Nginx), [Caddy](https://caddyserver.com/) or [Apache / httpd](https://en.wikipedia.org/wiki/Apache_HTTP_Server).

<blockquote class="reaction"><div class="reaction_text">In modern web deployments, your service may sit behind an <a target="_blank" href="https://learn.microsoft.com/en-us/azure/application-gateway/overview">application gateway</a>, potentially with multiple micro-services at play. We are going to simplify and consider no such factors in this article.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

### Simple, direct connection

{% clickableImage "img/simple.svg", "Schematic of a direct SSH connection" %}

Let's start with a classic default setup: [SSHD](https://man.openbsd.org/sshd.8), the SSH daemon of OpenSSH is listening on Port 22, your WebApp is accessed via HTTP and HTTPS on Port 80 and 443 respectively. Server-side, these ports are [port-forwarded](https://en.wikipedia.org/wiki/Port_forwarding) and accessible by anyone via a static IP address or a domain name.

You have the basics of SSH security: [fail2ban to prevent password brute forcing](https://github.com/fail2ban/fail2ban) and/or configured `SSHD` to [reject logins via password](https://www.cyberciti.biz/faq/how-to-disable-ssh-password-login-on-linux/) and only allow [key based authentication](https://www.digitalocean.com/community/tutorials/how-to-configure-ssh-key-based-authentication-on-a-linux-server). Whilst [security through obscurity](https://en.wikipedia.org/wiki/Security_through_obscurity) is bad, we don't have to make it *too* obvious for [random port scans](https://web.archive.org/web/20250319144156/https://support.censys.io/hc/en-us/articles/25692846962708-Censys-Internet-Scanning-Introduction) and `SSHD` on ports like [59274](https://datatracker.ietf.org/doc/html/rfc6335#section-6) is just as valid.

This "direct" connection also covers the case, that any intermediate corporate proxy has whitelisted this connection to be `direct`, is part of a company internal subnet not going through a proxy to the outside or that the target is within your company VPN.

#### Network capture
Let's take a look at what happens inside the network. All [captures](https://en.wikipedia.org/wiki/Packet_analyzer) are performed with [wireshark](https://github.com/wireshark/wireshark). **Source** 💻 is a Laptop attempting `ssh user@example.com`. **Target** 🌍 is the server with port 22 open. The capture concerns just this specific [TCP connection](https://en.wikipedia.org/wiki/Transmission_Control_Protocol). As there is no intermediary yet, the capture is performed on **Source** 💻.

Each individual packet's **Direction** is determined by the Source and Destination [IP address](https://en.wikipedia.org/wiki/IP_address), **Protocol** is judged by wireshark based on packet contents and connection history, **Length** is the packet size in bytes and **Info** is wireshark's quick summary of what the packet is or does. IPs and ports are left our for brevity.

<blockquote class="reaction"><div class="reaction_text">Rows with 💻 → 🌍 mean outgoing <a target="_blank" href="https://en.wikipedia.org/wiki/Network_packet">packets</a>, aka <strong>Source → Target</strong>. Rows with 🌍 → 💻 and a <span style="background-color: #0006">darker background</span> indicate incoming packets, aka <strong>Target → Source</strong>.</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>
<style>
	.targetSourceRow{
		background-color: #0004;
	}
	.mobileRow{
		display: none;
		max-width: 1px;
	}
	.noWrap {
		white-space: nowrap;
	}
	.mobileRow pre {
		margin-bottom: unset;
		padding-top: 0.5em;
		padding-bottom: 0.5em
	}
	@media screen and (max-width: 500px) {
		table td:nth-child(4),
		table th:nth-child(4) {
		    display: none;
		}
		table td{
			border-bottom: none;
		}
		.mobileRow{
			display: table-row;
		}
		.mobileRow td{
			max-width: 1px;
			border-bottom: 1px solid #40363a;
		}
	}
</style>
<table>
	<thead>
		<tr>
			<th>Direction</th>
			<th>Protocol</th>
			<th>Length</th>
			<th>Info</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td class="noWrap">💻 → 🌍</td>
			<td>TCP</td>
			<td>66</td>
			<td><code>[SYN] Seq=0 Win=64240 Len=0 MSS=1460 WS=256 SACK_PERM</code></td>
		</tr>
		<tr class="mobileRow">
			<td colspan=4><pre>[SYN] Seq=0 Win=64240 Len=0 MSS=1460 WS=256 SACK_PERM</pre></td>
		</tr>
		<tr class="targetSourceRow">
			<td class="noWrap">🌍 → 💻</td>
			<td>TCP</td>
			<td>66</td>
			<td><code>[SYN, ACK] Seq=0 Ack=1 Win=64240 Len=0 MSS=1460 SACK_PERM WS=128</code></td>
		</tr>
		<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>[SYN, ACK] Seq=0 Ack=1 Win=64240 Len=0 MSS=1460 SACK_PERM WS=128</pre></td>
		</tr>
		<tr>
			<td class="noWrap">💻 → 🌍</td>
			<td>TCP</td>
			<td>54</td>
			<td><code>[ACK] Seq=1 Ack=1 Win=131328 Len=0</code></td>
		</tr>
		<tr class="mobileRow">
			<td colspan=4><pre>[ACK] Seq=1 Ack=1 Win=131328 Len=0</pre></td>
		</tr>
		<tr>
			<td class="noWrap">💻 → 🌍</td>
			<td>SSHv2</td>
			<td>87</td>
			<td><code>Protocol (SSH-2.0-OpenSSH_for_Windows_9.5)</code></td>
		</tr>
		<tr class="mobileRow">
			<td colspan=4><pre>Protocol (SSH-2.0-OpenSSH_for_Windows_9.5)</pre></td>
		</tr>
		<tr class="targetSourceRow">
			<td class="noWrap">🌍 → 💻</td>
			<td>TCP</td>
			<td>60</td>
			<td><code>[ACK] Seq=1 Ack=34 Win=64256 Len=0</code></td>
		</tr>
		<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>[ACK] Seq=1 Ack=34 Win=64256 Len=0</pre></td>
		</tr>
		<tr class="targetSourceRow">
			<td class="noWrap">🌍 → 💻</td>
			<td>SSHv2</td>
			<td>95</td>
			<td><code>Protocol (SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.9)</code></td>
		</tr>
		<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>Protocol (SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.9)</pre></td>
		</tr>
		<tr>
			<td class="noWrap">💻 → 🌍</td>
			<td>SSHv2</td>
			<td>1486</td>
			<td><code>Key Exchange Init</code></td>
		</tr>
		<tr class="mobileRow">
			<td colspan=4><pre>Key Exchange Init</pre></td>
		</tr>
		<tr class="targetSourceRow">
			<td class="noWrap">🌍 → 💻</td>
			<td>SSHv2</td>
			<td>1110</td>
			<td><code>Key Exchange Init</code></td>
		</tr>
		<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>Key Exchange Init</pre></td>
		</tr>
		<tr>
			<td class="noWrap">💻 → 🌍</td>
			<td>SSHv2</td>
			<td>102</td>
			<td><code>Elliptic Curve Diffie-Hellman Key Exchange Init</code></td>
		</tr>
		<tr class="mobileRow">
			<td colspan=4><pre>Elliptic Curve Diffie-Hellman Key Exchange Init</pre></td>
		</tr>
		<tr class="targetSourceRow">
			<td class="noWrap">🌍 → 💻</td>
			<td>TCP</td>
			<td>60</td>
			<td><code>[ACK] Seq=1098 Ack=1514 Win=64128 Len=0</code></td>
		</tr>
		<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>[ACK] Seq=1098 Ack=1514 Win=64128 Len=0</pre></td>
		</tr>
		<tr class="targetSourceRow">
			<td class="noWrap">🌍 → 💻</td>
			<td>SSHv2</td>
			<td>562</td>
			<td><code>Elliptic Curve Diffie-Hellman Key Exchange Reply, New Keys, Encrypted packet (len=228)</code></td>
		</tr>
		<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>Elliptic Curve Diffie-Hellman Key Exchange Reply, New Keys, Encrypted packet (len=228)</pre></td>
		</tr>
		<tr>
			<td class="noWrap">💻 → 🌍</td>
			<td>SSHv2</td>
			<td>70</td>
			<td><code>New Keys</code></td>
		</tr>
		<tr class="mobileRow">	
			<td colspan=4><pre>New Keys</pre></td>
		</tr>
		<tr class="targetSourceRow">
			<td class="noWrap">🌍 → 💻</td>
			<td>TCP</td>
			<td>60</td>
			<td><code>[ACK] Seq=1606 Ack=1530 Win=64128 Len=0</code></td>
		</tr>
		<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>[ACK] Seq=1606 Ack=1530 Win=64128 Len=0</pre></td>
		</tr>
		<tr>
			<td class="noWrap">💻 → 🌍</td>
			<td>SSHv2</td>
			<td>98</td>
			<td><code>Encrypted packet (len=44)</code></td>
		</tr>
		<tr class="mobileRow">
			<td colspan=4><pre>Encrypted packet (len=44)</pre></td>
		</tr>
		<tr class="targetSourceRow">
			<td class="noWrap">🌍 → 💻</td>
			<td>TCP</td>
			<td>60</td>
			<td><code>[ACK] Seq=1606 Ack=1574 Win=64128 Len=0</code></td>
		</tr>
		<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>[ACK] Seq=1606 Ack=1574 Win=64128 Len=0</pre></td>
		</tr>
		<tr class="targetSourceRow">
			<td class="noWrap">🌍 → 💻</td>
			<td>SSHv2</td>
			<td>98</td>
			<td><code>Encrypted packet (len=44)</code></td>
		</tr>
		<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>Encrypted packet (len=44)</pre></td>
		</tr>
		<tr>
			<td class="noWrap">💻 → 🌍</td>
			<td>SSHv2</td>
			<td>114</td>
			<td><code>Encrypted packet (len=60)</code></td>
		</tr>
		<tr class="mobileRow">
			<td colspan=4><pre>Encrypted packet (len=60)</pre></td>
		</tr>
		<tr class="targetSourceRow">
			<td class="noWrap">🌍 → 💻</td>
			<td>TCP</td>
			<td>60</td>
			<td><code>[ACK] Seq=1650 Ack=1634 Win=64128 Len=0</code></td>
		</tr>
		<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>[ACK] Seq=1650 Ack=1634 Win=64128 Len=0</pre></td>
		</tr>
		<tr class="targetSourceRow">
			<td class="noWrap">🌍 → 💻</td>
			<td>SSHv2</td>
			<td>98</td>
			<td><code>Encrypted packet (len=44)</code></td>
		</tr>
		<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>Encrypted packet (len=44)</pre></td>
		</tr>
		<tr>
			<td class="noWrap">💻 → 🌍</td>
			<td>SSHv2</td>
			<td>554</td>
			<td><code>Encrypted packet (len=500)</code></td>
		</tr>
		<tr class="mobileRow">
			<td colspan=4><pre>Encrypted packet (len=500)</pre></td>
		</tr>
		<tr style="text-align: center; border-bottom: 1px solid #40363a;">
			<td colspan=4 ><code>Encrypted packets</code> go back and forth for the duration of the session</td>
		</tr>
	</tbody>
</table>

The first 3 packets are the standard [TCP handshake](https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_establishment). After that SSH begins its authentication, key change and encryption setup. You can *kinda* imply this to be SSH, as the communication happens on port 22. More obviously, anyone looking at the traffic can easily clock this as SSH, as the setup phase [loudly proclaims](https://datatracker.ietf.org/doc/html/rfc4253#section-4.2) to be SSH.

Even after the communication became fully encrypted, we can still infer this communication to be SSH, as this is still one specific connection, that we **know** previously talked with a "SSH smell". Inferring the connection type by looking at the packets and connection history is what's known as [packet-sniffing](https://en.wikipedia.org/wiki/Packet_analyzer).

### Blocked by a "dumb" firewall

{% clickableImage "img/dumbfirewall.svg", "SSH connection blocked by a firewall port block rule" %}

<blockquote class="reaction"><div class="reaction_text">Click the image for fullscreen, or finger zoom on mobile. The illustrations will get wider and wider going forward.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

A "dumb" [firewall](https://en.wikipedia.org/wiki/Firewall_(computing)), which performs no packet sniffing, is unable to block SSH *specifically*. These firewalls control which type ([UDP](https://en.wikipedia.org/wiki/User_Datagram_Protocol), [TCP](https://en.wikipedia.org/wiki/Transmission_Control_Protocol), [etc.](https://github.com/Hawzen/hdp)) of packet can go from and to which port, address or application. This applies to both stateless firewalls and [stateful firewalls](https://en.wikipedia.org/wiki/Stateful_firewall), a distinction which we'll ignore going forward.

<blockquote class="reaction"><div class="reaction_text">Of course, no such thing as "dumb" and "smart", it's all about rule-sets and policies. Specific security products, specific firewall configs, placement in the <a target="_blank" href="https://en.wikipedia.org/wiki/OSI_model">OSI Model</a>, is a can of worms this article will not touch.</div><img class="kiwi" src="/assets/kiwis/think.svg"></blockquote>

For now we look at client-side firewalls only. A popular "set and forget" firewall ruleset to allow internet access but block users from doing other stuff is to only permit outbound TCP Port 80 for HTTP, TCP Port 443 for HTTPS and block everything else. We are ignoring things like [DNS](https://en.wikipedia.org/wiki/Domain_Name_System), E-Mail, etc. here.

Our default SSH connection attempt will error out in such an environment. Provided the domain itself isn't blacklisted, [DNS](https://en.wikipedia.org/wiki/Domain_Name_System) resolves correctly and the OS isn't aware of the firewall rule giving you a `ssh: connect to host example.com port 22: Permission denied`, you'll get this [timeout](https://en.wikipedia.org/wiki/Timeout_(computing)) error after a waiting period:

```tunnelingArticleShell
$ ssh user@example.com
ssh: connect to host example.com port 22: Connection timed out
```

#### Network capture
**Source** 💻 is a Laptop attempting `ssh user@example.com`. **Target** 🌍 is the server with port 22 open. Here is what traffic looks like if a firewall is blocking the outgoing communication via a simple port block. Capture is again on **Source** 💻.

<table>
	<thead>
		<tr>
			<th>Direction</th>
			<th>Protocol</th>
			<th>Length</th>
			<th>Info</th>
		</tr>
	</thead>
	<tbody>
<tr><td class="noWrap">💻 → 🌍</td><td>TCP</td><td>74</td><td><code>[SYN] Seq=0 Win=64240 Len=0 MSS=1460 SACK_PERM=1 WS=128</code></td></tr>
<tr class="mobileRow"><td colspan=4><pre>[SYN] Seq=0 Win=64240 Len=0 MSS=1460 SACK_PERM=1 WS=128</pre></td></tr>
<tr><td class="noWrap">💻 → 🌍</td><td>TCP</td><td>74</td><td><code>[TCP Retransmission] [SYN] Seq=0 Win=64240 Len=0 MSS=1460 SACK_PERM=1 WS=128</code></td></tr>
<tr class="mobileRow"><td colspan=4><pre>[TCP Retransmission] [SYN] Seq=0 Win=64240 Len=0 MSS=1460 SACK_PERM=1 WS=128</pre></td></tr>
		<tr style="text-align: center; border-bottom: 1px solid #40363a;">
			<td colspan=4>This goes on for 5 more <code>[TCP Retransmission]</code> packets</td>
		</tr>
	</tbody>
</table>

As you might have expected, SSH sends a TCP Handshake `SYN`, which never reaches the server, prompting a bunch of `[TCP Retransmission]` before giving up with a timeout error.

### SSH on port 443

{% clickableImage "img/sshport443.svg", "Usage of different port: SSH connection passing firewall blocking rule" %}

Let's start with the most obvious workaround for our "dumb" firewall case: Set the SSH port to 443. As two services cannot share the same port, we must either disable our HTTP and HTTPS service or set one of them to another port.

This will get us past our dumb firewall case, but will obviously prevent our WebApp from being reachable. Except for the port number, the network capture will look identical to the direct connection case and any packet sniffer will still be able to tell that this is an SSH connection.

### [SSLH](https://github.com/yrutschle/sslh): HTTP and SSH on the same port

{% clickableImage "img/sslh.svg", "SSLH multiplexing both HTTPS and SSH" %}

One popular solution to this is the connection multiplexer [SSLH](https://github.com/yrutschle/sslh). It's usually setup to listen on port 443, checks whether the incoming connection is SSH or HTTPS and establishes the connection to SSHD or your HTTP service respectively. SSLH can do more, but that's the gist of it.

<blockquote class="reaction"><div class="reaction_text">To be clear, the connections themselves are not mixed protocol and the clients need no modification. SSLH only determines where the connection is established to.</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

From the perspective of the client, nothing changed as compared to a direct connection. However, it requires a **new piece of software** to sit in front of your entire server-side communication stack. One more thing to maintain, one more thing to fail. Still subject to be blocked by corporate proxies and packet sniffing firewalls.

### Blocked by a "smart" firewall

{% clickableImage "img/smartfirewall.svg", "SSH connection blocked by a packet-inspecting firewall" %}

A "smart" firewall can additionally look inside packets and block connections based on what traffic it sees. When faced with a smart firewall setup to block either SSH specifically or only allow "normal" web traffic, you will get a timeout error like this:

```tunnelingArticleShell
$ ssh user@example.com
kex_exchange_identification: read: Connection timed out
banner exchange: Connection to example.com port 22: Connection timed out
```

#### Network capture
**Source** 💻 is a Laptop attempting `ssh user@example.com`. **Target** 🌍 is the server with port 22 open. Here is what traffic look like if it's not going through and being filtered by a smart firewall, which inspects traffic. Capture performed on **Source** 💻 Laptop.

<table>
	<thead>
	<tr>
		<th>Direction</th>
		<th>Protocol</th>
		<th>Length</th>
		<th>Info</th>
	</tr>
	</thead>
	<tbody>
	<tr>
		<td class="noWrap">💻 → 🌍</td>
		<td>TCP</td>
		<td>66</td>
		<td><code>[SYN] Seq=0 Win=64240 Len=0 MSS=1460 WS=256 SACK_PERM</code></td>
	</tr>
	<tr class="mobileRow">
			<td colspan=4><pre>[SYN] Seq=0 Win=64240 Len=0 MSS=1460 WS=256 SACK_PERM</pre></td>
	</tr>
	<tr class="targetSourceRow">
		<td class="noWrap">🌍 → 💻</td>
		<td>TCP</td>
		<td>66</td>
		<td><code>[SYN, ACK] Seq=0 Ack=1 Win=64240 Len=0 MSS=1452 SACK_PERM WS=128</code></td>
	</tr>
	<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>[SYN, ACK] Seq=0 Ack=1 Win=64240 Len=0 MSS=1452 SACK_PERM WS=128</pre></td>
	</tr>
	<tr>
		<td class="noWrap">💻 → 🌍</td>
		<td>TCP</td>
		<td>54</td>
		<td><code>[ACK] Seq=1 Ack=1 Win=132096 Len=0</code></td>
	</tr>
	<tr class="mobileRow">
			<td colspan=4><pre>[ACK] Seq=1 Ack=1 Win=132096 Len=0</pre></td>
	</tr>
	<tr>
		<td class="noWrap">💻 → 🌍</td>
		<td>SSHv2</td>
		<td>87</td>
		<td><code>[PSH, ACK] Seq=1 Ack=1 Win=132096 Len=33, Payload: SSH-2.0-OpenSSH_for_Windows_9.5</code></td>
	</tr>
	<tr class="mobileRow">
			<td colspan=4><pre>[PSH, ACK] Seq=1 Ack=1 Win=132096 Len=33, Payload: SSH-2.0-OpenSSH_for_Windows_9.5</pre></td>
	</tr>
	<tr>
		<td class="noWrap">💻 → 🌍</td>
		<td>SSHv2</td>
		<td>87</td>
		<td><code>[TCP Retransmission] [PSH, ACK] Seq=1 Ack=1 Win=132096 Len=33, Payload: SSH-2.0-OpenSSH_for_Windows_9.5</code></td>
	</tr>
	<tr class="mobileRow">
			<td colspan=4><pre>[TCP Retransmission] [PSH, ACK] Seq=1 Ack=1 Win=132096 Len=33, Payload: SSH-2.0-OpenSSH_for_Windows_9.5</pre></td>
	</tr>	
	<tr style="text-align: center; border-bottom: 1px solid #40363a;">
		<td colspan=4>This goes on for 7 more <code>[TCP Retransmission]</code> packets</td>
	</tr>
	<tr>
		<td class="noWrap">💻 → 🌍</td>
		<td>TCP</td>
		<td>54</td>
		<td><code>[RST, ACK] Seq=34 Ack=1 Win=0 Len=0</code></td>
	</tr>
	<tr class="mobileRow">
			<td colspan=4><pre>[RST, ACK] Seq=34 Ack=1 Win=0 Len=0</pre></td>
	</tr>	
	</tbody>
</table>

<blockquote class="reaction"><div class="reaction_text">Wireshark wasn't smart enough to label the failed banner exchange packets as SSH, even though the packets clearly indicate it was. I changed it manually in this section for completeness.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

The target successfully answers our call for a TCP connection, but never responds to our requests, before our clients gives up with the [`RST`](https://developers.cloudflare.com/fundamentals/reference/tcp-connections/#tcp-connections-and-keep-alives) signal. In the case of TCP connections, "smart" firewalls allow the initial connection to take place, look at what comes next and judge based on that.

After initial TCP connection, the next thing to be sent is the [SSH identification string](https://datatracker.ietf.org/doc/html/rfc4253#section-4.2), something that unequivocally flags our connection as SSH, which the firewall blocks. That's the reason SSH doesn't timeout outright, but rather with this specific `banner exchange` timeout. The [identification strings](https://datatracker.ietf.org/doc/html/rfc4253#section-4.2) never make it to the other side.

Let's reverse our perspective and take a look at server-side. **Source** 🖥️ is the server with SSHD on port 22 and **Target** 🌍 is a Laptop attempting `ssh user@example.com`, the very same connection attempt as above. Capture performed on **Source** 🖥️ Server, which hosts SSHD.

<table>
	<thead>
	<tr>
		<th>Direction</th>
		<th>Protocol</th>
		<th>Length</th>
		<th>Info</th>
	</tr>
	</thead>
	<tbody>
<tr class="targetSourceRow"><td class="noWrap">🌍 → 🖥️</td><td>TCP</td><td>66</td><td><code>[SYN] Seq=0 Win=64240 Len=0 MSS=1452 WS=256 SACK_PERM
</code></td>
	</tr>
	<tr class="mobileRow targetSourceRow"><td colspan=4><pre>[SYN] Seq=0 Win=64240 Len=0 MSS=1452 WS=256 SACK_PERM</pre></td>
	</tr>
<tr><td class="noWrap">🖥️ → 🌍</td><td>TCP</td><td>66</td><td><code>[SYN, ACK] Seq=0 Ack=1 Win=64240 Len=0 MSS=1460 SACK_PERM WS=128
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>[SYN, ACK] Seq=0 Ack=1 Win=64240 Len=0 MSS=1460 SACK_PERM WS=128</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🌍 → 🖥️</td><td>TCP</td><td>60</td><td><code>[ACK] Seq=1 Ack=1 Win=132096 Len=0
</code></td>
	</tr>
	<tr class="mobileRow targetSourceRow"><td colspan=4><pre>[ACK] Seq=1 Ack=1 Win=132096 Len=0</pre></td>
	</tr>
<tr><td class="noWrap">🖥️ → 🌍</td><td>SSHv2</td><td>75</td><td><code>[PSH, ACK] Seq=1 Ack=1 Win=64256 Len=21, Payload: SSH-2.0-OpenSSH_9.9
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>[PSH, ACK] Seq=1 Ack=1 Win=64256 Len=21, Payload: SSH-2.0-OpenSSH_9.9</pre></td>
	</tr>
<tr><td class="noWrap">🖥️ → 🌍</td><td>SSHv2</td><td>75</td><td><code>[TCP Retransmission] [PSH, ACK] Seq=1 Ack=1 Win=64256 Len=21, Payload: SSH-2.0-OpenSSH_9.9
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>[TCP Retransmission] [PSH, ACK] Seq=1 Ack=1 Win=64256 Len=21, Payload: SSH-2.0-OpenSSH_9.9</pre></td>
	</tr>
	<tr style="text-align: center; border-bottom: 1px solid #40363a;">
		<td colspan=4>This goes on for 7 more <code>[TCP Retransmission]</code> packets</td>
	</tr>
	<tr><td class="noWrap">🖥️ → 🌍</td><td>TCP</td><td>54</td><td><code>[FIN, ACK] Seq=22 Ack=1 Win=64256 Len=0
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>[FIN, ACK] Seq=22 Ack=1 Win=64256 Len=0</pre></td>
	</tr>
		</tbody>
</table>

Same deal here. We observe the initial TCP connection being established, but with a sudden stop of communication, followed by a [slow whimper](https://archive.org/details/poems19091925030616mbp/page/n133/mode/2up) of server-side identification string retransmission call-outs into the void.

<blockquote class="reaction"><div class="reaction_text">You may see server-side <a target="_blank" href="https://github.com/openssh/openssh-portable/blob/6c49e5f7dcaf886b4a702a6c003cae9dca04d3ea/sshd.c#L596"><code>Not allowed at this time</code></a> packets instead, as OpenSSH is <a target="_blank" href="https://github.com/openssh/openssh-portable/blob/6c49e5f7dcaf886b4a702a6c003cae9dca04d3ea/sshd.c#L596">rate-limiting by default via the <code>MaxStartups</code> and penalty system</a>. Either way, these packets are never heard.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

## The corporate proxy

{% clickableImage "img/proxyBasic.svg", "Corporate Proxy used as egress point to the internet. Any other outbound connection not going through the proxy (eg. SSH) is blocked by a firewall" %}

A corporate proxy is an exit point to the internet, deployed for security and compliance reasons within a company to monitor for threats and forbid anything that isn't explicitly allowed. Furthermore it's supposed to curb [data exfiltration](https://en.wikipedia.org/wiki/Data_exfiltration) and ensure employees don't setup infrastructure, without clearing it with IT prior.

<blockquote class="reaction"><div class="reaction_text"><strong>Far</strong> beyond any malicious hacking, employees misconfiguring things, uploading sensitive data to 3rd parties and similar faux pas are <strong>the</strong> prime reason for data leaks.</div><img class="kiwi" src="/assets/kiwis/facepalm.svg"></blockquote>

These proxies are usually part of an overarching IT and endpoint security package sold by companies like [ThreatLocker](https://www.threatlocker.com), [Forcepoint](https://forcepoint.com) and [Cisco](https://www.cisco.com), among others. In Windows land, these are usually setup by [Group policies](https://en.wikipedia.org/wiki/Group_Policy) pre-configuring a system-wide proxy and in *Nix land these are usually pre-configured with an initial OS image.

Among these corporate proxies, it's standard to have packet sniffing capabilities, preventing connections that don't pass the sniff-test of "looks like normal internet access". Going forward, we will circumvent this and do so in a way that makes dev tools happy. Before that, let's clear the elephants in the room...

Why not just a VPN? Projects like [tailscale](https://tailscale.com) ***are*** the right tool for the job here after all. But in certain environments, their use may simply be not possible. Whether due to policy or architecture, VPNs may not be an option. Having another way to interface with a target, with a matching level of security to a VPN is what I want to explore.

***Deep*** consideration ***is needed*** on whether such a setup is **actually** required and whether or not this may violate existing security policies. Infrastructure decisions are made as a team. Let's find out what's possible, with seemingly simple, standard tooling:

### Honoring the proxy
Proxies are such a vital piece of infrastructure, that we expect the operating system's proxy settings to be honored by default, built proxy settings into most network connected software and have additional defacto standards to specify them like the environment variables `http_proxy`, `HTTPS_PROXY`, `NO_PROXY` and friends.

<figure>
	<img src="img/firefoxProxy.png" alt="Firefox's proxy settings" />
	<figcaption>Firefox's proxy settings</figcaption>
</figure>

But what may come as a surprise, is that such a fundamental piece of infrastructure like OpenSSH doesn't support it, with the exception of [SSH as a proxy](https://goteleport.com/blog/ssh-proxyjump-ssh-proxycommand/) itself. [Unix philosophy](https://en.wikipedia.org/wiki/Unix_philosophy#Origin) and all that. SSH clients like [Putty](https://www.putty.org/) do, but we'll stick with OpenSSH. It's [FOSS](https://en.wikipedia.org/wiki/Free_and_open-source_software), other tools rely on it and it comes pre-installed on every OS by now.

<figure>
	<img src="img/OpenSSH-in-windows.png" alt="OpenSSH Client installed by default in Windows 10 and 11" />
	<figcaption>OpenSSH Client installed by default in Windows 10 and 11</figcaption>
</figure>

<blockquote class="reaction"><div class="reaction_text">With OpenSSH instead of tools like Putty we also get to use Terminals like the <a target="_blank" href="https://github.com/microsoft/terminal">new Windows Terminal</a> or <a target="_blank" href="https://ghostty.org/"> GhostTTY</a> with modern design, good font support and copy-paste that doesn't make you <a target="_blank" href="https://superuser.com/a/180045">blow your brains out</a></div><img class="kiwi" src="/assets/kiwis/happy.svg"></blockquote>
<a></a>

<figure>
	<img src="img/console.png" alt="OpenSSH Connection in Windows Terminal" />
	<figcaption>OpenSSH Connection in Windows Terminal</figcaption>
</figure>

OpenSSH supplies `ProxyCommand` and relies on other tools proxying for it. Many ways to do this. For now, let's start with the simplest ones, with no extra encryption at play. There are FOSS [`connect.c` aka `ssh-connect`](https://github.com/gotoh/ssh-connect) and [corkscrew](https://github.com/bryanpkc/corkscrew), working on Linux, BSD, Mac OS and Windows.

<blockquote class="reaction"><div class="reaction_text">Linux, BSD and MacOS have <a target="_blank" href="https://en.wikipedia.org/wiki/Netcat"><code>nc</code></a> preinstalled, which can also be used. But we are ignoring it for brevity, as it's more of a general purpose tool and the <a target="_blank" href="https://scoop.sh/#/apps?q=netcat&id=8bec774707c893d2baf0cb999c13936c7bebc306">windows builds</a> are flagged by Windows Defender.</div><img class="kiwi" src="/assets/kiwis/think.svg"></blockquote>

`ssh-connect` created by [@gotoh](https://github.com/gotoh) recently moved to GitHub. Most online documentation now points to [a dead bitbucket repo](https://bitbucket.org/gotoh/connect). On Windows specifically it comes as `connect.exe`, installed by default with [Git for Windows](https://gitforwindows.org/) and can also [be installed via Scoop](https://scoop.sh/#/apps?q=connect&id=bdf819b2986269a3c7c29074c2d26870a17c4a88) or [MSYS](https://packages.msys2.org/base/mingw-w64-connect).

Though not quite the same, in the context of the article [corkscrew](https://github.com/bryanpkc/corkscrew) does the same. It is more well known as a project, [just 260 lines of C](https://github.com/bryanpkc/corkscrew/blob/master/corkscrew.c), but in contrast to `ssh-connect` has no widely distributed Windows build. For x64 Windows, I have compiled it myself and here it is as a shortcut for testing: [corkscrew.zip](corkscrew.zip).

### Baby's first tunnel
Both `corkscrew` and `ssh-connect` are very simple and can authenticate if the proxy uses `basic auth`. To confirm connection to `SSHD` you don't need to configure SSH. All proxy commands are supposed to return the [SSH identification string](https://datatracker.ietf.org/doc/html/rfc4253#section-4.2), which is how you can check if a connection is established.

<blockquote class="reaction"><div class="reaction_text">Let's use <a target="_blank" href="https://datatracker.ietf.org/doc/html/rfc5737#section-3"><code>198.51.100.4</code></a> and port <code>8080</code> for our corporate proxy.</div><img class="kiwi" src="/assets/kiwis/speak.svg"></blockquote>

```tunnelingArticleShell
$ corkscrew 198.51.100.4 8080 example.com 22
SSH-2.0-OpenSSH_9.9

/* or */

$ connect -H 198.51.100.4:8080 example.com 22
SSH-2.0-OpenSSH_9.9
```

If those proxy commands successfully return the [server-side SSH identification string](https://datatracker.ietf.org/doc/html/rfc4253#section-4.2), we are good to go and can use it with SSH. If not, you can diagnose and look for the reason at this stage, without SSH spewing errors at you. Now to use it with SSH, we can supply the `ProxyCommand` like:

```tunnelingArticleShell
$ ssh -o ProxyCommand="corkscrew 198.51.100.4 8080 example.com 22" user@

/* or */

$ ssh -o ProxyCommand="connect -H 198.51.100.4:8080 example.com 22" user@
```

<blockquote class="reaction"><div class="reaction_text">This annoyingly long command is <strong>not</strong> how you use SSH. We skip proper SSH configuration until later in the article.</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

Using this and optionally `-i` for the keyfile, we can connect to our target server. Note how `ProxyCommand` now determines destination and port. Whilst we can use [placeholders `%h %p`](https://man.openbsd.org/ssh_config#ProxyCommand), `ssh` itself is not involved in matters of routing anymore, so neither `-p` for non-default ports, nor destination after `user@` is required.

{% clickableImage "img/tunneledHTTP.svg", "SSH tunneled via HTTP" %}

By using `corkscrew` or `ssh-connect`, we instruct the intermediate proxy to handle the connection to SSH port 22 for us and OpenSSH now gets SSH packets delivered by `ProxyCommand`. But why would a corporate proxy do this? How do you make HTTP talk in SSH? [That's the neat thing, you don't...](https://www.youtube.com/watch?v=se17_0zbZds&t=10s)

#### Network capture
**Source** 💻 is a Laptop performing `ssh -o ProxyCommand="corkscrew 198.51.100.4 8080 example.com 22" user@`. **Target** 🏢 is an intermediate proxy sitting in between a private subnet and the internet. The capture is performed on this intermediate proxy **Target** 🏢.

<table>
	<thead>
		<tr>
			<th>Direction</th>
			<th>Protocol</th>
			<th>Length</th>
			<th>Info</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td class="noWrap">💻 → 🏢</td>
			<td>TCP</td>
			<td>66</td>
			<td><code>[SYN] Seq=0 Win=64240 Len=0 MSS=1460 WS=256 SACK_PERM=1</code></td>
	</tr>
	<tr class="mobileRow">
			<td colspan=4><pre>[SYN] Seq=0 Win=64240 Len=0 MSS=1460 WS=256 SACK_PERM=1</pre></td>
	</tr>
	<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TCP</td><td>66</td>
<td><code>[SYN, ACK] Seq=0 Ack=1 Win=64240 Len=0 MSS=1460 SACK_PERM=1 WS=128</code></td>
	</tr>
	<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>[SYN, ACK] Seq=0 Ack=1 Win=64240 Len=0 MSS=1460 SACK_PERM=1 WS=128</pre></td>
	</tr>
<tr><td class="noWrap">💻 → 🏢</td><td>TCP</td><td>60</td>
<td><code>[ACK] Seq=1 Ack=1 Win=131328 Len=0</code></td>
	</tr>
	<tr class="mobileRow">
			<td colspan=4><pre>[ACK] Seq=1 Ack=1 Win=131328 Len=0</pre></td>
	</tr>
<tr><td class="noWrap">💻 → 🏢</td><td>TCP</td><td>89</td>
<td><code>CONNECT  example.com:22 HTTP/1.0  [TCP segment of a reassembled PDU]</code></td>
	</tr>
	<tr class="mobileRow">
			<td colspan=4><pre>CONNECT  example.com:22 HTTP/1.0  [TCP segment of a reassembled PDU]</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TCP</td><td>54</td>
<td><code>[ACK] Seq=1 Ack=36 Win=64256 Len=0</code></td>
	</tr>
	<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>[ACK] Seq=1 Ack=36 Win=64256 Len=0</pre></td>
	</tr>
<tr><td class="noWrap">💻 → 🏢</td><td>HTTP</td><td>60</td>
<td><code>CONNECT  example.com:22 HTTP/1.0</code></td>
	</tr>
	<tr class="mobileRow">
			<td colspan=4><pre>CONNECT  example.com:22 HTTP/1.0</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TCP</td><td>54</td>
<td><code>[ACK] Seq=1 Ack=38 Win=64256 Len=0</code></td>
	</tr>
	<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>[ACK] Seq=1 Ack=38 Win=64256 Len=0</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>HTTP</td><td>93</td>
<td><code>HTTP/1.0 200 Connection established</code></td>
	</tr>
	<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>HTTP/1.0 200 Connection established</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>SSH</td><td>95</td>
<td><code>Protocol (SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.9)</code></td>
	</tr>
	<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>Protocol (SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.9)</pre></td>
	</tr>
<tr><td class="noWrap">💻 → 🏢</td><td>SSHv2</td><td>87</td>
<td><code>Protocol (SSH-2.0-OpenSSH_for_Windows_9.5)</code></td>
	</tr>
	<tr class="mobileRow">
			<td colspan=4><pre>Protocol (SSH-2.0-OpenSSH_for_Windows_9.5)</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TCP</td><td>54</td>
<td><code>[ACK] Seq=81 Ack=71 Win=64256 Len=0</code></td>
	</tr>
	<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>[ACK] Seq=81 Ack=71 Win=64256 Len=0</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>SSHv2</td><td>1110</td>
<td><code>Key Exchange Init</code></td>
	</tr>
	<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>Key Exchange Init</pre></td>
	</tr>
<tr><td class="noWrap">💻 → 🏢</td><td>TCP</td><td>1078</td>
<td><code>[TCP segment of a reassembled PDU]</code></td>
	</tr>
	<tr class="mobileRow">
			<td colspan=4><pre>[TCP segment of a reassembled PDU]</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TCP</td><td>54</td>
<td><code>[ACK] Seq=1137 Ack=1095 Win=64128 Len=0</code></td>
	</tr>
	<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>[ACK] Seq=1137 Ack=1095 Win=64128 Len=0</pre></td>
	</tr>
<tr><td class="noWrap">💻 → 🏢</td><td>SSHv2</td><td>510</td>
<td><code>Key Exchange Init, Diffie-Hellman Key Exchange Init</code></td>
	</tr>
	<tr class="mobileRow">
			<td colspan=4><pre>Key Exchange Init, Diffie-Hellman Key Exchange Init</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TCP</td><td>54</td>
<td><code>[ACK] Seq=1137 Ack=1551 Win=64128 Len=0</code></td>
	</tr>
	<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>[ACK] Seq=1137 Ack=1551 Win=64128 Len=0</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>SSHv2</td><td>562</td>
<td><code>Diffie-Hellman Key Exchange Reply, New Keys, Encrypted packet (len=228)</code></td>
	</tr>
	<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>Diffie-Hellman Key Exchange Reply, New Keys, Encrypted packet (len=228)</pre></td>
	</tr>
<tr><td class="noWrap">💻 → 🏢</td><td>SSHv2</td><td>114</td>
<td><code>New Keys, Encrypted packet (len=44)</code></td>
	</tr>
	<tr class="mobileRow">
			<td colspan=4><pre>New Keys, Encrypted packet (len=44)</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>SSHv2</td><td>98</td>
<td><code>Encrypted packet (len=44)</code></td>
	</tr>
	<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>Encrypted packet (len=44)</pre></td>
	</tr>
<tr><td class="noWrap">💻 → 🏢</td><td>SSHv2</td><td>114</td>
<td><code>Encrypted packet (len=60)</code></td>
	</tr>
	<tr class="mobileRow">
			<td colspan=4><pre>Encrypted packet (len=60)</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>SSHv2</td><td>98</td>
<td><code>Encrypted packet (len=44)</code></td>
	</tr>
	<tr class="mobileRow targetSourceRow">
			<td colspan=4><pre>Encrypted packet (len=44)</pre></td>
	</tr>
<tr><td class="noWrap">💻 → 🏢</td><td>SSHv2</td><td>554</td>
<td><code>Encrypted packet (len=500)</code></td>
	</tr>
	<tr class="mobileRow">
			<td colspan=4><pre>Encrypted packet (len=500)</pre></td>
	</tr>
		<tr style="text-align: center; border-bottom: 1px solid #40363a;">
		<td colspan=4><code>Encrypted packets</code> go back and forth for the duration of the session</td>
		</tr>
	</tbody>
</table>

We communicate by SSH (a TCP protocol) over the corporate proxy, which speaks HTTP (also a TCP protocol). Though that term is a bit murky, this classifies our setup as **tunneling**. The center point of all this is packet number 6 - [✨ HTTP CONNECT ✨](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/CONNECT)

`corkscrew` and `ssh-connect` instruct the corporate proxy to connect to our target server's SSH port and relay back what it hears via the command `HTTP CONNECT`. `HTTP CONNECT` works by relaying RAW TCP. Similar to the dumb firewall previously, HTTP CONNECT doesn't understand ***what*** TCP it's actually relaying.

So why not forbid `HTTP CONNECT`? - Because that would break proxy connections with [HTTP***S***](https://en.wikipedia.org/wiki/HTTPS), basic building block of modern web. Ignoring the unencrypted [SNI](https://en.wikipedia.org/wiki/Server_Name_Indication), the point of HTTPS is that the communication is encrypted. For the corporate proxy to work, it has to relay TCP blindly. That's what [HTTP CONNECT](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/CONNECT) is for.

<blockquote class="reaction"><div class="reaction_text">We will cover DPI / TLS stripping later. There are network setups which can prohibit <code>HTTP CONNECT</code>. In such cases tunneling has to run deeper with projects like <a target="_blank" href="https://github.com/erebe/wstunnel">wstunnel</a>, but we won't be covering that here.</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

If you take a look at the traffic, you *still* see the connection being clocked as SSH. The intermediate proxy talks to the destination server `example.com:22` and thus can see the unencrypted SSH setup. If the corporate proxy performs packet sniffing, it will have no issues blocking this. Let's fix that.

<blockquote class="reaction"><div class="reaction_text">So far, our tunneling method <strong>doesn't hide anything</strong>, but I've seen this setup work more often than not, even in environments where outgoing SSH was supposedly blocked.</div><img class="kiwi" src="/assets/kiwis/think.svg"></blockquote>

## ✨ HTTP***S*** Tunneling ✨
Now we get into the meat and potatoes. If we want to hide from packet inspection based filtering, we need encryption on top of our communication, so the setup phase doesn't give away the SSH nature of our connection. Luckily there is a super convenient and universally compatible way: Just like HTTPS - [TLS](https://en.wikipedia.org/wiki/HTTPS).

Instead of talking to `SSHD` directly, we let the main HTTP server [NGINX](https://en.wikipedia.org/wiki/Nginx), [Caddy](https://caddyserver.com/) or [Apache](https://en.wikipedia.org/wiki/Apache_HTTP_Server) on our server handle the routing to and from `SSHD`. All the automated encryption, certificate handling and IP range whitelisting, ***without*** the need for an open SSH port. Implemented by, once again:  [✨ HTTP CONNECT ✨](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/CONNECT)

{% clickableImage "img/tunneledHTTPS.svg", "SSH tunneled via HTTPS with intermediate proxy" %}

Both corporate proxies ***and*** smart firewalls trying to packet-inspect, will be met with HTTPS encryption. Just like visiting the website of a bank to conduct online financial transactions, intermediates will have no insight into the connection, and most importantly for us, no insight into what ***type*** of connection it is.

{% clickableImage "img/tunneledHTTPSFirewall.svg", "SSH tunneled via HTTPS with packet inspecting firewall" %}

The client-side tool for this is the FOSS [proxytunnel](https://github.com/proxytunnel/proxytunnel), which is available for Linux, Mac, BSD and has [automated builds for Windows](https://github.com/proxytunnel/proxytunnel/actions). Actively maintained, it just had [a new release this month](https://github.com/proxytunnel/proxytunnel/releases/tag/v1.12.3). `proxytunnel` can use windows specific [NTLM](https://en.wikipedia.org/wiki/NTLM) authentication and fully covers previously mentioned `corkscrew` and `ssh-connect` capabilities.

<blockquote class="reaction"><div class="reaction_text">It's not available on <a target="_blank" href="https://scoop.sh/">Scoop</a>, though I'm hoping to change that with <a target="_blank" href="https://github.com/ScoopInstaller/Main/pull/6409">this Pull Request</a></div><img class="kiwi" src="/assets/kiwis/miffed.svg"></blockquote>

`proxytunnel` instructs our HTTP server to `HTTP CONNECT` us to our server's `SSHD`. With no intermediate proxy, something `corkscrew` and `ssh-connect` can as well! But `proxytunnel` can chain mutliple `HTTP CONNECT` if there is a corporate proxy in-between and most importantly: with HTTP***S*** (TLS) encryption on top.

But first, our HTTP server has to play along...

### Server-side setup

{% clickableImage "img/tunneledHTTPSZoom.svg", "SSH tunneled via HTTPS - Server-Side setup" %}

The neat thing is, we can utilize the very same HTTP server our WebApp is most likely served or [reverse proxied](https://www.cloudflare.com/learning/cdn/glossary/reverse-proxy/) over. To do so, we need to configure `HTTP CONNECT`, restrict it to localhost port 22 only and setup optional authentication. Luckily all the popular FOSS HTTP servers, [Nginx](https://en.wikipedia.org/wiki/Nginx), [Caddy](https://caddyserver.com/) and [Apache / httpd](https://en.wikipedia.org/wiki/Apache_HTTP_Server) can do so.

<blockquote class="reaction"><div class="reaction_text">No new software server-side. No port-forwarding, besides pre-existing HTTP ones. No need to touch the <code>SSHD</code> config either.</div><img class="kiwi" src="/assets/kiwis/party.svg"></blockquote>

Due to how `HTTP CONNECT` works, we can setup the connection on the granularity of a domain or subdomain. So we can do `ssh.example.com` only, but we don't have to and can keep it on the same level as the main WebApp `example.com`. The presence of `HTTP CONNECT` does not impact standard HTTP routing in any way.

You can slap on [`basic auth`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication#basic_authentication_scheme) and/or IP whitelisting, basic HTTP config stuff I won't describe for brevity. It's totally fine to leave this wide open though, as that corresponds to a port-forwarded OpenSSH. Totally normal, given the security mechanisms of OpenSSH and optional hardening mentioned [at the beginning](#simple%2C-direct-connection).

<blockquote class="reaction"><div class="reaction_text">It should go without saying: if your HTTP server goes down, your SSH connection does too, so it's probably a good idea to keep the standard port-forwarded SSH as a backup, given no other means of access.</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

We will be setting up on port `443` with HTTPS here, though you may perform the same setup without HTTPS, which simply means moving the setup to the non-HTTPS block in the respective config file. I will cover HTTPS only going forward and, of course, the optional `basic auth` without HTTPS is meaningless.

<blockquote class="reaction"><div class="reaction_text">Crucially, one <strong>must</strong> take care to only allow such a connection to <code>localhost:(SSHD Port)</code> A config slip-up here would be <strong>catastrophic</strong>, allowing bad actors to pose as oneself.</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

#### Apache / httpd
Apache / httpd [supports this by default](https://httpd.apache.org/docs/2.4/mod/mod_proxy_connect.html), nothing more than a config addition needed. The module responsible for this is [`mod_proxy_connect`](https://httpd.apache.org/docs/2.4/mod/mod_proxy_connect.html) and should be precompiled and included everywhere you can get Apache to my knowledge. The addition happens on the level of a `virtualHost`

<details open><summary>Apache Config to enable <code>HTTP_CONNECT</code> and restrict it to 127.0.0.1:22</summary>

```apacheconf
<VirtualHost *:443>
	ServerName example.com

	SSLEngine on
	SSLCertificateFile /etc/nixos/proxy-selfsigned.crt # Don't actually handle certs manually, just enable ACME
	SSLCertificateKeyFile /etc/nixos/proxy-selfsigned.key # Don't actually handle certs manually, just enable ACME

	## ... Main WebApp Config ... ##

	LoadModule proxy_connect_module modules/mod_proxy_connect.so # Module for HTTP_CONNECT
	ProxyRequests On # Enable it
	AllowCONNECT 22 # Restrict HTTP_CONNECT to port 22
	<Proxy *>
		Require all denied # Disable proxying for other targets
	</Proxy>
	<Proxy 127.0.0.1:22> # See the article's comments below, you may have to allow for the 'ServerName' here, instead of 127.0.0.1
		Require all granted # Enable proxying to our localhost:22
	</Proxy>
</VirtualHost>
```
</details>


If you fell for the [NixOS](https://nixos.org/) Meme, then your [`services.httpd`](https://search.nixos.org/options?&from=0&size=50&sort=relevance&type=packages&query=services.httpd) config should look like this.

<details open><summary>Apache Config for <code>HTTP_CONNECT</code> on NixOS</summary>

```nix
httpd = {
  enable = true;
  virtualHosts = {
    "example.com" = {
      listen = [
        {
          ip = "*";
          port = 443;
          ssl = true;
        }
      ];
      sslServerCert = "/etc/nixos/proxy-selfsigned.crt"; # Don't actually handle certs manually, just enable ACME
      sslServerKey = "/etc/nixos/proxy-selfsigned.key"; # Don't actually handle certs manually, just enable ACME
      documentRoot = "/var/www/static";
      extraConfig = ''
        LoadModule proxy_connect_module modules/mod_proxy_connect.so
        ProxyRequests On
        AllowCONNECT 22
        <Proxy *>
            Require all denied
        </Proxy>
        <Proxy 127.0.0.1:22>
            Require all granted
        </Proxy>
      '';
    };
  };
};
```
</details>

#### Nginx
Nginx requires an additional patch applied and module compiled to enable `HTTP_CONNECT`: [ngx_http_proxy_connect_module](https://github.com/chobits/ngx_http_proxy_connect_module). Luckily, support goes way back to Nginx `1.4` in 2013 and the patch has remained identical for every version since `1.21.1` in 2021. Build steps are minimal and described on the GitHub page.

After the module is in nginx, you can simply insert `proxy_connect` at the server-block level (or higher).
```nginx
proxy_connect;
proxy_connect_allow 22; # restrict to port 22
proxy_connect_address 127.0.0.1; # restrict to localhost
```

For NixOS and its `services.nginx`, module inclusion should be covered by [services.nginx.additionalModules](https://search.nixos.org/options?channel=24.11&show=services.nginx.additionalModules&from=0&size=50&sort=relevance&type=packages&query=services.nginx.addi), but due to a version check, nix will refuse to compile with the newest nginx. I started fixing it [in this PR](https://github.com/NixOS/nixpkgs/pull/351880) and will finish it after releasing this article. In the meantime, here's my config with an override in place:

<details><summary>Nginx Config on NixOS with module override for newest nginx</summary>

```nix
{ config, lib, pkgs, ... }:

let
  http_proxy_connect_module = pkgs.stdenv.mkDerivation {
    pname = "http_proxy_connect_module";
    version = "4f0b6c2297862148c59a0d585d6c46ccb7e58a39";
    src = pkgs.fetchFromGitHub {
      owner = "chobits";
      repo = "ngx_http_proxy_connect_module";
      rev = "4f0b6c2297862148c59a0d585d6c46ccb7e58a39";
      sha256 = "sha256-Yob2Z+a3ex3Ji6Zz8J0peOYnKpYn5PlC9KsQNcHCL9o=";
    };
    patches = [ "${pkgs.fetchFromGitHub {
      owner = "chobits";
      repo = "ngx_http_proxy_connect_module";
      rev = "4f0b6c2297862148c59a0d585d6c46ccb7e58a39";
      sha256 = "sha256-Yob2Z+a3ex3Ji6Zz8J0peOYnKpYn5PlC9KsQNcHCL9o=";
    }}/patch/proxy_connect_rewrite_102101.patch" ];

    meta = {
      license = [ lib.licenses.bsd2 ];
      description = "Forward proxy module for handling CONNECT requests";
      homepage = "https://github.com/chobits/ngx_http_proxy_connect_module";
    };
  };
in
{
	services = {
		
		# Rest of the config

	    nginx = {
	      enable = true;

		  # Rest of the config

	      additionalModules = [ http_proxy_connect_module ];

	      virtualHosts = {
	        "example.com" =  {

	          # Rest of the config

	          extraConfig = ''
	            proxy_connect;
	            proxy_connect_allow 22;
	            proxy_connect_address 127.0.0.1;
	          '';
	        };
```
</details>

#### Caddy
Caddy v2 gained `HTTP_CONNECT` capability last year with an [update](https://github.com/caddyserver/forwardproxy/pull/74#) to module [forwardproxy](https://github.com/caddyserver/forwardproxy). Compiling and module inclusion is [dead simple](https://github.com/caddyserver/forwardproxy?tab=readme-ov-file#quick-start). In the `caddyfile`, you can insert the `HTTP CONNECT` config.

```bash
https://example.com {
        forward_proxy { # Enable HTTP_CONNECT
                ports 22 # Restrict to port 22
                acl {
                        allow example.com # Restrict to this domain. It should be 127.0.0.1, but doesn't quite work out, more on that below. Also extra context: https://github.com/proxytunnel/proxytunnel/issues/84#issuecomment-2463191906
                        deny all # Deny everything else
                }
        }
}
```

Normally, `HTTP CONNECT` and standard HTTP coexist independently. On Caddy it's either or it seems. I'm not a Caddy user and can't comment on how to make both the relay to port 22 and the preservation of the main WebApp on the same (sub)domain block work. I hope Caddy users can chime and I will correct it in an addendum.

<blockquote class="reaction"><div class="reaction_text">With just a couple config lines, we gained the ability to publicly expose any TCP port, without access to any of the underlying infrastructure.</div><img class="kiwi" src="/assets/kiwis/drillHappy.svg"></blockquote>

As long as the desired client, not ***just*** `ssh`, is being fed by `proxytunnel` or understands `HTTP CONNECT` itself, then we attained a de-facto port-forwarding to any TCP port we desire, bypassing server-side firewalls. There *can* be server-side blocks for `HTTP CONNECT`, but it's trivial to go a level deeper with projects like [wstunnel](https://github.com/erebe/wstunnel).

### Client-side connection
Just like previously, we can first test the connection without OpenSSH. We have to specify our own HTTP server as a proxy, the final destination to `localhost:22`, as well the intermediate corporate proxy, if there is any. So **One** proxy if there is a direct connection to our Server, **Two** with an intermediate proxy.

A bit confusingly, `proxytunnel` uses the terms `Local proxy (-p)` for the first and `Remote proxy (-r)` for the second jump. Our HTTP server becomes `Local proxy` if there is a direct connection, like with the smart firewall case. If there is an intermediate proxy, our server becomes `Remote proxy`. Example with corporate proxy `198.51.100.4:8080`:

```tunnelingArticleShell
$ proxytunnel -X -z -p 198.51.100.4:8080 -r example.com:443 -d 127.0.0.1:22
Via 198.51.100.4:8080 -> example.com:443 -> 127.0.0.1:22
SSH-2.0-OpenSSH_9.9
```

- `-p 198.51.100.4:8080` specifies the corporate proxy
- `-r example.com:443` specifies our server, with the (sub)domain of where we configured `HTTP CONNECT`
  - `-X` specifies, that there is HTTPS on this `Remote Proxy`
  - Without an intermediate proxy, our server would become `-p`
  - We would also have to use `-E`, not `-X` in that case to specify HTTPS on `Local Proxy`, again a bit confusing nomenclature
- `-d 127.0.0.1:22` specifies the final destination to our `SSHD` service.
  - As the connection happens after our HTTP server receives the information, this is regardless of port-forwarding port 22.
- `-z` tells to ignore HTTPS certificate checks, especially if you self-sign
  - Provided there is no `basic auth`, we don't actually need to trust our connection, as encryption is handled by OpenSSH regardless
  - Making the certificate check work on Windows is [a bit of a pain](https://github.com/proxytunnel/proxytunnel/issues/82).

<blockquote class="reaction"><div class="reaction_text">You can additionally specify <code>-v</code> for more debug information on the connection.</div><img class="kiwi" src="/assets/kiwis/book.svg"></blockquote>

`proxytunnel` answers us with a nice arrow `->` illustrated connection path and finally with the OpenSSH identification string, provided everything worked correctly. If there is no intermediate proxy, then the command will look like this:

```tunnelingArticleShell
$ proxytunnel -E -z -p example.com:443 -d 127.0.0.1:22
Via example.com:443 -> 127.0.0.1:22
SSH-2.0-OpenSSH_9.9
```

<blockquote class="reaction"><div class="reaction_text">If you see <code>SSH-2.0-OpenSSH_X.X</code>, you hit the jackpot</div><img class="kiwi" src="/assets/kiwis/party.svg"></blockquote>

#### Pit falls
If you don't see a `SSH-2.0-OpenSSH_X.X` reply, there could be a multitude of reasons. ***First***: try your (sub)domain:(ssh port) as a destination. This is technically wrong, but due to [how HTTP CONNECT works](https://github.com/proxytunnel/proxytunnel/issues/84#issuecomment-2463191906), you may need to tell `HTTP CONNECT` that the destination is `example.com:22`, **even if** there is no such thing.

```tunnelingArticleShell
$ proxytunnel -X -z -p 198.51.100.4:8080 -r example.com:443 -d example.com:22
Via 198.51.100.4:8080 -> example.com:443 -> example.com:22
SSH-2.0-OpenSSH_9.9
```

You can fix this for nginx, by [specifying that server-block as `default_server`](https://github.com/proxytunnel/proxytunnel/issues/84#issuecomment-2463191906), which will make `127.0.0.1:22` work as a destination. If that is not desired, keep using the `-d` workaround. To my understanding, in Caddy you have to use the workaround. Apache should have no such issues, by I never fully confirmed it.

`proxytunnel`, `nginx` and `apache` only support up to `HTTP/1.1` with `HTTP CONNECT`. If the corporate proxy initiates a `HTTP/2` connection, you'll error out. You can restrict it to `HTTP/1.1` server-side or corporate-proxy-side. `Caddy` can also do `HTTP/2` and `HTTP/3`, but again, `proxytunnel` can't.

<blockquote class="reaction"><div class="reaction_text">Performance wise, none of this matters. The theoretical benefits of <code>HTTP/2</code> and <code>HTTP/3</code> don't apply to tunneled SSH.</div><img class="kiwi" src="/assets/kiwis/teach.svg"></blockquote>

Finally: `Caddy` is a cheery lad ヽ(*・ω・)ﾉ and really likes to give a thumbs up, even if everything goes wrong. Even if proxytunnel's `-v` debug info says `Tunnel established.`, but there is no `SSH-2.0-OpenSSH_X.X`, it indicates a missing `HTTP CONNECT`, incomplete routing or block due to [`acl`](https://github.com/atenart/caddy-acl).

### SSH Config
We *could* already connect like this:

```tunnelingArticleShell
$ ssh -o ProxyCommand="proxytunnel -X -z -p 198.51.100.4:8080 -r example.com:443 -d 127.0.0.1:22" user@
```

For many reason, like compatibility with dev tools, we'll be specifying a proper [SSH config](https://man.openbsd.org/ssh_config). In your user directory is an ssh config directory. `/home/<username>/.ssh` aka `~/.ssh` on *NIX and `C:\Users\<username>\.ssh` aka `%userprofile%\.ssh` on Windows. Inside is extension-less file `config`. If not, create both.

For clarity let's use user name `kiwi` for the user we want to login as at our server and user name `frost` for the user on the client laptop. For reasons we'll get into shortly, if you are on Windows: use absolute paths for everything starting from `C:\` **and** re-specify the default [UserKnownHostsFile](https://man.openbsd.org/ssh_config#UserKnownHostsFile).

```tunnelingArticleSSH
UserKnownHostsFile 'C:\Users\frost\.ssh\known_hosts' # Re-specify on Windows with absolute path, Quotes if path contains spaces
ServerAliveInterval 30 # Keep-Alive Packet every 30 seconds to ensure the connection doesn't terminate

## Configuring 3 Hosts. We only need one, but let's lay them all out for clarity:
# Case with Corporate Proxy in-between
Host exampleCorporate
    User kiwi
    IdentityFile 'C:\Users\frost\.ssh\keyFile' # Not required, if password authentication used instead, Quotes if path contains spaces, keep path absolute on Windows! 
    ProxyCommand proxytunnel.exe -X -z -p 198.51.100.4:8080 -r example.com:443 -d 127.0.0.1:22
	# Proxy command takes care of of both HostName and Port

# Case to simply go around a packet-sniffing firewall
Host exampleFirewall
    User kiwi
    IdentityFile 'C:\Users\frost\.ssh\keyFile' # Not required, if password authentication used instead, Quotes if path contains spaces, keep path absolute on Windows! 
    ProxyCommand proxytunnel.exe -E -z -p example.com:443 -d 127.0.0.1:22

# Classic, Direct connection case without ProxyCommand
Host exampleDirect
	HostName example.com
	Port 22 # Only required if OpenSSH port-forwarded on non-standard port
    User kiwi
    IdentityFile 'C:\Users\frost\.ssh\keyFile' # Not required, if password authentication used instead, Quotes if path contains spaces, keep path absolute on Windows! 
```

Now we have 3 ssh settings. Simply typing `ssh exampleCorporate` should connect you to the target server as user `kiwi`, whilst tunneling along the way. `ssh exampleFirewall` will connect you via the tunnel if there is no intermediate proxy and `ssh exampleDirect` will do the classic direct connection.

### Network capture
**Source** 💻 is a Laptop performing `ssh exampleCorporate` aka `ssh -o ProxyCommand="proxytunnel -X -z -p 198.51.100.4:8080 -r example.com:443 -d 127.0.0.1:22" kiwi@`. **Target** 🏢 is a corporate proxy sitting in between a private subnet and the internet. The capture is performed on proxy **Target** 🏢.

<table>
	<thead>
		<tr>
			<th>Direction</th>
			<th>Protocol</th>
			<th>Length</th>
			<th>Info</th>
		</tr>
	</thead>
	<tbody>
	<td class="noWrap">💻 → 🏢</td><td>TCP		</td><td> 66</td>
<td><code>	[SYN] Seq=0 Win=64240 Len=0 MSS=1460 WS=256 SACK_PERM=1
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>[SYN] Seq=0 Win=64240 Len=0 MSS=1460 WS=256 SACK_PERM=1</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TCP		</td><td> 66</td>
<td><code>	[SYN, ACK] Seq=0 Ack=1 Win=64240 Len=0 MSS=1460 SACK_PERM=1 WS=128
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>[SYN, ACK] Seq=0 Ack=1 Win=64240 Len=0 MSS=1460 SACK_PERM=1 WS=128</pre></td>
	</tr>
<td class="noWrap">💻 → 🏢</td><td>TCP		</td><td> 60</td>
<td><code>	[ACK] Seq=1 Ack=1 Win=131328 Len=0
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>[ACK] Seq=1 Ack=1 Win=131328 Len=0</pre></td>
	</tr>
<td class="noWrap">💻 → 🏢</td><td>HTTP		</td><td> 157</td>
<td><code>	CONNECT example.com:443 HTTP/1.1
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>CONNECT example.com:443 HTTP/1.1</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TCP		</td><td> 54</td>
<td><code>	[ACK] Seq=1 Ack=104 Win=64256 Len=0
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>[ACK] Seq=1 Ack=104 Win=64256 Len=0</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>HTTP		</td><td> 93</td>
<td><code>	HTTP/1.1 200 Connection established
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>HTTP/1.1 200 Connection established</pre></td>
	</tr>
<td class="noWrap">💻 → 🏢</td><td>TLSv1		</td><td> 380</td>
<td><code>	Client Hello
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>Client Hello</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TCP		</td><td> 54</td>
<td><code>	[ACK] Seq=40 Ack=430 Win=64128 Len=0
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>[ACK] Seq=40 Ack=430 Win=64128 Len=0</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TLSv1.2	</td><td>	 2666</td>
<td><code>	Server Hello, Certificate, Server Key Exchange, Server Hello Done
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>Server Hello, Certificate, Server Key Exchange, Server Hello Done</pre></td>
	</tr>
<td class="noWrap">💻 → 🏢</td><td>TCP		</td><td> 60</td>
<td><code>	[ACK] Seq=430 Ack=2652 Win=131328 Len=0
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>[ACK] Seq=430 Ack=2652 Win=131328 Len=0</pre></td>
	</tr>
<td class="noWrap">💻 → 🏢</td><td>TLSv1.2	</td><td>	 212</td>
<td><code>	Client Key Exchange, Change Cipher Spec, Encrypted Handshake Message
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>Client Key Exchange, Change Cipher Spec, Encrypted Handshake Message</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TCP		</td><td> 54</td>
<td><code>	[ACK] Seq=2652 Ack=588 Win=64128 Len=0
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>[ACK] Seq=2652 Ack=588 Win=64128 Len=0</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TLSv1.2	</td><td>	 105</td>
<td><code>	Change Cipher Spec, Encrypted Handshake Message
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>Change Cipher Spec, Encrypted Handshake Message</pre></td>
	</tr>
<td class="noWrap">💻 → 🏢</td><td>TLSv1.2	</td><td>	 184</td>
<td><code>	Application Data
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>Application Data</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TCP		</td><td> 54</td>
<td><code>	[ACK] Seq=2703 Ack=718 Win=64128 Len=0
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>[ACK] Seq=2703 Ack=718 Win=64128 Len=0</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TLSv1.2	</td><td>	 142</td>
<td><code>	Application Data
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>Application Data</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TLSv1.2	</td><td>	 124</td>
<td><code>	Application Data
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>Application Data</pre></td>
	</tr>
<td class="noWrap">💻 → 🏢</td><td>TLSv1.2	</td><td>	 116</td>
<td><code>	Application Data
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>Application Data</pre></td>
	</tr>
<tr class="targetSourceRow"><td class="noWrap">🏢 → 💻</td><td>TLSv1.2	</td><td>	 1139</td>
<td><code>	Application Data
</code></td>
	</tr>
	<tr class="mobileRow"><td colspan=4><pre>Application Data</pre></td>
	</tr>
		<tr style="text-align: center; border-bottom: 1px solid #40363a;">
		<td colspan=4><code>Application Data</code> packets go back and forth for the duration of the session</td>
		</tr>
	</tbody>
</table>

The proxy is [none the wiser](https://www.youtube.com/watch?v=otCpCn0l4Wo&t=15s)! Now there is no way for the proxy to know what's going on and block us.  Except [with specialized tooling mostly relegated to research](https://inria.hal.science/hal-01273160/file/HTTPS_traffic_identification_framework_NOMS16.pdf), which looks at the encrypted traffic and squints *really* hard, packet-inspection cannot tell the difference between a normal HTTPS Website and our SSH.


<blockquote class="reaction"><div class="reaction_text"> Off-topic: <a target="_blank" href="https://www.youtube.com/watch?v=UfenH7xKO1s">LLMs can guess somewhat accurately what LLMs are outputting based purely on <strong>encrypted</strong> packet length</a>, if the chat frontend sends token by token as packet by packet.</div><img class="kiwi" src="/assets/kiwis/surprised.svg"></blockquote>

Now, so far we have made an assumption: HTTPS won't betray us. This is an assumption that online banking, financial transaction, medical institutions make, that unfortunately cannot be made in general. Advanced IT company security packages may perform...

### Deep Packet Inspection
[DPI aka TLS decryption](https://en.wikipedia.org/wiki/Deep_packet_inspection) is a technique that involves forcing your machine to trust an intermediate certificate, allow an intermediate to decrypt your connection for inspection and re-encrypt it after inspection.

In the context of HTTPS or corporate connections, this involved pre-installing a [Trusted Root Certificate Authority](https://en.wikipedia.org/wiki/Certificate_authority) on the user's machine (i.e. via Windows' group policy). Such a dangerous idea, that even the [NSA](https://en.wikipedia.org/wiki/National_Security_Agency) issued [an advisory](https://web.archive.org/web/20191119195359/https://media.defense.gov/2019/Nov/18/2002212783/-1/-1/0/MANAGING%20RISK%20FROM%20TLS%20INSPECTION_20191106.PDF) and the [Cypersecurity & Infrastructure Security Agency CISA](https://en.wikipedia.org/wiki/Cybersecurity_and_Infrastructure_Security_Agency) outright [cautions against it](https://www.cisa.gov/news-events/alerts/2017/03/16/https-interception-weakens-tls-security).

A compromise of that intermediate root certificate would mean a whole company's connections being readable in clear text. [DPI is easily detectable](https://www.grc.com/fingerprints.htm), as re-encryption changes certificate fingerprints. You can check against known fingerprints in the browser's certificate detail view or this command:

```tunnelingArticleShell
$ openssl s_client -proxy <Corporate Proxy IP>:<Corporate Proxy Port> -connect <Site which is not blocked>:443 -servername <Site which is not blocked> | openssl x509 -noout -fingerprint -sha1
```

**Ultimately**, on the networking side you can sandwich *another* layer of encryption in-between, making DPI's HTTPS stripping meaningless. **Ultimately Ultimately**, everything we talked about is network side and a security package sitting on your PC at kernel level can intercept truly anything.

## What *not* to do
Before we finish by making dev tools sing, let's quickly go over what to avoid. Some projects go the jackhammer route of exposing the system shell as an HTTP service. The more popular ones are [Wetty](https://github.com/butlerx/wetty) and [Shell in a Box](https://github.com/shellinabox/shellinabox). These are excellent projects in their own right and there are situations where they are a good solution...

...managing public web apps is not one of them. With their reliance on HTTPS for encryption, even ignoring potential DPI, it takes only one config mishap to expose full console access. Especially when web apps change management, things like this are easily forgotten. One misunderstanding away from disaster.

## Dev tools
Now that we can `ssh exampleCorporate` to automatically connect via our encrypted tunnel, let's make sure our dev tools are happy. If `git` is used via SSH, it should work automatically. Thanks to [Unix philosophy](https://en.wikipedia.org/wiki/Unix_philosophy#Origin), everything mostly works automatically. Mostly.
### VSCode
<figure>
	<img src="img/vscode.png" alt="Remote SSH file editing in VSCode" />
	<figcaption>Remote SSH file editing in VSCode</figcaption>
</figure>

[VSCode's SSH integration](https://code.visualstudio.com/docs/remote/ssh) should work automatically. Browsing, editing and downloading files with no extra settings required. The SSH config should be automatically detected by VS Code and be selectable when initiating a connection. Same goes for [TRAMP](https://www.gnu.org/software/emacs/manual/html_node/tramp/Quick-Start-Guide.html) in [Emacs](https://en.wikipedia.org/wiki/Emacs).
### SCP
The basic file copying [`scp`](https://man.openbsd.org/scp) works universally as well and is installed whenever the OpenSSH client is. Syntax remains also the same. Invocations like `scp exampleCorporate:/path/to/source/file /path/to/target` will automatically use the HTTPS tunnel. Nothing interesting here.
### Rsync
Provided your WebApp doesn't have server-side CI/CD, you or your CI/CD system will be uploading files to your target server. A WebApp build usually contains many assets, font files, videos and `scp -r` just doesn't cut it, retransferring everything. [rsync](https://en.wikipedia.org/wiki/Rsync) is widely used to accelerate this task and file copies in general.

It copies folder structures, preserves their permissions, but does so whilst only copying what actually changed and applies compression for faster transfers. This makes `rsync` easily 100x faster when compared to `scp -r` when there are a bunch of assets, but you only changed the code a bit.

<blockquote class="reaction"><div class="reaction_text">Honestly, <code>rsync</code> is a life saver.</div><img class="kiwi" src="/assets/kiwis/love.svg"></blockquote>

Whilst rsync has no running service, it needs to be installed on the server as well. On the client side things are are just as simple, as with `scp`: `rsync -avz --progress /path/to/source/folder exampleCorporate:/path/to/target/folder` to upload a folder and show live progress will work automatically via the tunnel... 

...unless you are on Windows...

#### Rsync on Windows
This is a bit of an interesting [story](https://en.wikipedia.org/wiki/CwRsync). On Windows there exist two versions of rsync. The standard FOSS rsync client with [source code from the Samba project](https://rsync.samba.org/) and [cwRsync](https://en.wikipedia.org/wiki/CwRsync), which has a free client but is closed sourced and [monetized via its server component](https://itefix.net/store/buy?product=49.00000004) by [itefix](https://itefix.net/).

<blockquote class="reaction"><div class="reaction_text">cwRsync has a right to exist, though I do find it a bit scummy to capitalize on FOSS projects <a target="_blank" href="https://www.cygwin.com/">Cygwin</a> and Rsync, considering the client is presumably mostly the FOSS Rsync source, compiled via cygwin.</div><img class="kiwi" src="/assets/kiwis/miffed.svg"></blockquote>
<a></a>

Anyhow, connecting to proxies with cwRsync simply won't work, if you don't call it from a unix emulating environment. cwRsync will error out with `/bin/sh not found`, due to how [itefix](https://itefix.net/) setup the compilation. Luckily the free open source way works, though the calling convention in windows is a bit of a mess.

The issue is, that rsync needs to be called with the OpenSSH that it was built with, as it is linked against a specific version. But OpenSSH in turn ***also*** needs to call our proxy command. The way this call-chain happens depends on compilation environment and settings. In Windows' Shell, [cygwin](https://www.cygwin.com/) is responsible for translating these calls.

The call of `rsync.exe` → `ssh.exe` works, but the subsequent call of `ssh.exe` → `proxytunnel.exe`, `connect.exe` or `corkscrew.exe` fails, due to cygwin and its requirement of `sh.exe` to be present. Providing your own `sh.exe` won't work due to binary incompatibility.

<blockquote class="reaction"><div class="reaction_text">With <a target="_blank" href="https://itefix.net/">itefix</a>'s cwRsync there is no way to fix it, since it's closed source. 👎</div><img class="kiwi" src="/assets/kiwis/facepalm.svg"></blockquote>
<a></a>

This calling convention needs the binary to be in a `usr/bin/` subfolder with `sh.exe` present, due to how cygwin hardcodes things, otherwise you get a `/bin/sh: No such file or directory`. Unfortunately, the flexible windows package managers like [scoop](https://scoop.sh/) ships with cwRsync only, something I hope to fix in a PR.

Without resorting to full [WSL](https://learn.microsoft.com/en-us/windows/wsl/install), we would need to install [MSYS2](https://www.msys2.org/), install rsync and make it available in PATH. Big fan of MSYS, but that's too much of a mess. As a shortcut, I extracted rsync `v3.4.1` from MSYS2 and the associated `ssh`. Beware that the `usr/bin/` structure ***needs*** to be intact due to Cygwin hardcoding.

Here it is: [rsync-3.4.1-windows.zip](rsync-3.4.1-windows.zip)

<blockquote class="reaction"><div class="reaction_text">Took me a while to figure this mess out.</div><img class="kiwi" src="/assets/kiwis/tired.svg"></blockquote>
<a></a>

We could just call it from inside MSYS2 or WSL and everything would be fine, but we would be referring to different SSH configs and you may have *other* tools in turn calling rsync, so this needs to work outside of MSYS and WSL. Let's start by extracting rsync and exposing its `usr/bin/` in `PATH`:

<figure>
	<img src="PATH.png" alt="Setting the PATH variable for rsync in Windows" />
	<figcaption>Setting the PATH variable for rsync in Windows</figcaption>
</figure>

There are many tutorials showing how to set `PATH`, so I skip the details here. Restarting your terminal or closing ***all*** VSCode windows, if you use the VSCode integrated one, you will have gained access to command `rsync`. We can invoke rsync with a long command like this:

```tunnelingArticleShell
$ rsync -e 'C:\rsync\ssh.exe -F C:\Users\frost\.ssh\config' -avz --progress exampleCorporate:/path/to/source/folder /path/to/target/folder
bash.exe: warning: could not find /tmp, please create!
Via 198.51.100.4:8080 -> example.com:443 -> 127.0.0.1:22
Enter passphrase for key 'C:\Users\frost\.ssh\keyFile':
sending incremental file list
/path/to/target/folder/posts/tunneling-corporate-firewalls/rsync-3.4.1-windows.zip
      7,765,500 100%    4.30MB/s    0:00:01 (xfr#2, to-chk=53/10810)
/path/to/target/folder/posts/tunneling-corporate-firewalls/tunneling-corporate-firewalls.md
         83,344 100%  135.20kB/s    0:00:00 (xfr#3, to-chk=52/10810)

sent 6,136,784 bytes  received 18,824 bytes  373,067.15 bytes/sec
total size is 420,857,408  speedup is 68.37
```

The reason we used absolute paths even in the ssh config, is that rsync is in an invisible *nix environment provided by cygwin and cygwin's path translation won't resolve correctly otherwise. Same reason we re-specified `UserKnownHostsFile`. It would work without, but you'd get annoying `This key is not known by any other names` messages each login.

You can ignore the `bash.exe` error, irrelevant for our case. `-e` let's us specify the correct ssh and the related config. If we don't specify it and let the system ssh take over, it will ***seem*** to connect, but will fail with a confusing error:

```tunnelingArticleShell
$ rsync -avz --progress exampleCorporate:/path/to/source/folder /path/to/target/folder
Via 198.51.100.4:8080 -> example.com:443 -> 127.0.0.1:22
Enter passphrase for key 'C:\Users\frost\.ssh\keyFile':
rsync: connection unexpectedly closed (0 bytes received so far) [Receiver]
rsync error: error in rsync protocol data stream (code 12) at io.c(232) [Receiver=3.4.1]
rsync: [sender] safe_read failed to read 4 bytes: Connection reset by peer (104)
rsync error: error in rsync protocol data stream (code 12) at io.c(283) [sender=3.4.1]
```

But that's an awfully long command and other tools using rsync won't know it. Luckily, there is a way to specify a default: environment variable `RSYNC_RSH`, which is equivalent to the parameter `-e`. Same deal as before, lot's of online explanations on how to set environment variables in Windows.
<figure>
	<img src="RSYNC_RSH.png" alt="Setting the RSYNC_RSH to instruct rsync to use the correct OpenSSH" />
	<figcaption>Setting the RSYNC_RSH to instruct rsync to use the correct OpenSSH</figcaption>
</figure>

And after all that, we can ***finally*** use rsync via HTTPS tunneling, like we would on any *Nix platform or environment:

```tunnelingArticleShell
$ rsync -avz --progress exampleCorporate:/path/to/source/folder /path/to/target/folder
```

<blockquote class="reaction"><div class="reaction_text">It's kind of bananas what we have to go through on Windows to get basic tooling without resorting to <a target="_blank" href="https://learn.microsoft.com/en-us/windows/wsl/install">WSL</a> or <a target="_blank" href="https://www.msys2.org/">MSYS 2</a>. Makes me really appreciate what a fine piece of engineering <a target="_blank" href="https://www.msys2.org/">MSYS 2</a> is.</div><img class="kiwi" src="/assets/kiwis/surprised.svg"></blockquote>
<a></a>

## Finishing up:
<blockquote class="reaction"><div class="reaction_text">I should clarify that just like a VPN, this is a powerful tool that can dodge traffic blocking...</div><img class="kiwi" src="/assets/kiwis/detective.svg"></blockquote>

Everything we talked about applies to circumventing internet content filtering as well, as SSH [supports Dynamic port forwarding](https://man.openbsd.org/ssh#D), allowing you to browse the web, if you connect via `ssh -D 8888 exampleCorporate` and point your browser to `localhost:8888` as a `SOCKS5` proxy [in the network settings](https://support.mozilla.org/en-US/kb/connection-settings-firefox).

Your server turns into a quasi VPN, with you browsing the web from the perspective of the server, no corporate content filters. It's standard practice to [block changes to proxy settings company wide](https://support.google.com/chrome/a/answer/187202). But it's **up to the browser** to enforce such policies, making it a useless security measure.

<blockquote class="reaction"><div class="reaction_text"><a target="_blank" href="https://youtu.be/b23wrRfy7SM?t=12">With great power comes great responsibility</a>. Hope this article gave insight into what's possible, besides the classic ways of server access.</div><img class="kiwi" src="/assets/kiwis/happy.svg"></blockquote>
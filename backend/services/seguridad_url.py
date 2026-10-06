import ipaddress
import socket
from urllib.parse import urlparse


def url_publica_segura(url: str) -> bool:
    """True solo si es http(s) y el host resuelve únicamente a IPs públicas."""
    try:
        p = urlparse(url)
        if p.scheme not in ("http", "https") or not p.hostname:
            return False
        puerto = p.port or (443 if p.scheme == "https" else 80)
        for info in socket.getaddrinfo(p.hostname, puerto):
            ip = ipaddress.ip_address(info[4][0])
            if (ip.is_private or ip.is_loopback or ip.is_link_local
                    or ip.is_reserved or ip.is_multicast or ip.is_unspecified):
                return False
        return True
    except Exception:
        return False
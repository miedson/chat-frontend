"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

type MenuItem = {
	href: string;
	label: string;
};

type AppMenuProps = {
	kicker: string;
	title: string;
	description: string;
	items: MenuItem[];
	actions?: ReactNode;
};

export function AppMenu({
	kicker,
	title,
	description,
	items,
	actions,
}: AppMenuProps) {
	const pathname = usePathname();

	return (
		<header className="app-menu">
			<div className="app-menu-info">
				<span className="chat-kicker">{kicker}</span>
				<h1>{title}</h1>
				<p>{description}</p>
			</div>

			<nav className="app-menu-nav" aria-label="Menu principal">
				{items.map((item) => {
					const active = pathname === item.href;
					return (
						<Link
							key={item.href}
							href={item.href}
							className={active ? "is-active" : ""}
						>
							{item.label}
						</Link>
					);
				})}
			</nav>

			{actions ? <div className="app-menu-actions">{actions}</div> : null}
		</header>
	);
}

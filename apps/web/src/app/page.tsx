import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>OKR Tracker</h1>
      <nav>
        <ul>
          <li>
            <Link href="/objectives">Objectives</Link>
          </li>
          <li>
            <Link href="/dashboard">Dashboard</Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}

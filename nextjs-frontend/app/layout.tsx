import '../src/app/globals.css'

export const metadata = {
  title: 'Agent Management Software',
  description: 'Manage your agents efficiently',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

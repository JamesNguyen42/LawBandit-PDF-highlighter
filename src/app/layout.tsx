import './globals.css'

export const metadata = {
  title: 'LawBandit PDF Highlighter',
  description: 'Enhanced PDF reader with smooth highlighting for law students',
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

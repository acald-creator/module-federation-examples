import { AppProps } from 'next/app'
import dynamic from 'next/dynamic'

const App = dynamic(
  async() => {
    return import('../async-pages/_app')
  },
  {
    ssr: false,
  }
)

function MyApp(props: AppProps) {
  return <App {...props} />
}

export default MyApp
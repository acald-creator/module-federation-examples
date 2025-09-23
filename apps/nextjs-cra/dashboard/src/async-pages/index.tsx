import Button from '../components/Button';
import dynamic from 'next/dynamic';
import Box from '@/components/Box';
import { styled } from '../../stitches.config';
import { PerformanceDashboard } from '@mf-examples/performance-monitor';

const RemoteButton = dynamic(() =>
  // @ts-ignore
  import('remote/Button'), {
  ssr: false,
});

const CloudRemoteButton = dynamic(() =>
  // @ts-ignore
  import('cloud/Button'), {
  ssr: false,
})

const Text = styled('p', {
  fontFamily: '$system',
  color: '$hiContrast',
})

export default function Home() {
  return (
    <Box css={{ paddingY: '$6' }}>
      <Text as="h1">Next JS and React with Module Federation</Text>

      {/* Performance Dashboard */}
      <PerformanceDashboard
        enabled={true}
        includeWebVitals={true}
        includeModuleFederation={true}
        includeBundleAnalysis={true}
        remoteUrls={['http://localhost:8081', 'http://localhost:8082']}
        autoReport={true}
        reportInterval={15000}
        title="Module Federation Performance Monitor"
        showDownloadButton={true}
        showClearButton={true}
        style={{
          marginBottom: '32px',
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          padding: '16px'
        }}
      />

      <Text as="h2">Host - Button</Text>
      <Button />
      <Text as="h2">Remote - Button</Text>
      <RemoteButton />
      <Text as="h2">Cloud - Button</Text>
      <CloudRemoteButton />
    </Box>
  );
}
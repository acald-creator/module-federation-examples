import Button from '../components/Button';
import dynamic from 'next/dynamic';
import Box from '@/components/Box';
import { styled } from '../../stitches.config';

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
      <Text as="h1">Next JS and React</Text>
      <Text as="h2">Host - Button</Text>
      <Button />
      <Text as="h2">Client - Button</Text>
      <RemoteButton />
      <Text as="h2">Client - Cloud Button</Text>
      <CloudRemoteButton />
    </Box>
  );
}
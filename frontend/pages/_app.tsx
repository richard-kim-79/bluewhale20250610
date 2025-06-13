import '../styles/globals.css';
import React from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { AuthProvider } from '../contexts/AuthContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Head>
        <title>BlueWhale</title>
        <meta name="description" content="BlueWhale - Knowledge Management System with Vector Search" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;

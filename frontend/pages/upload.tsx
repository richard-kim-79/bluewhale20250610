import React from 'react';
import { GetServerSideProps } from 'next';
import Layout from '../components/Layout';
import UploadForm from '../components/UploadForm';
import ProtectedRoute from '../components/ProtectedRoute';
import { withAuth } from '../utils/auth';

const UploadPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <Layout title="Upload Document">
        <UploadForm />
      </Layout>
    </ProtectedRoute>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  return withAuth(context);
};

export default UploadPage;

import { GetServerSidePropsContext } from 'next';
import { ParsedUrlQuery } from 'querystring';

/**
 * Utility function to check if a user is authenticated on the server side
 * and redirect to login if not authenticated
 */
export const withAuth = async (
  context: GetServerSidePropsContext<ParsedUrlQuery>,
  callback?: (context: GetServerSidePropsContext<ParsedUrlQuery>) => Promise<any>
) => {
  const { req, res } = context;
  const token = req.cookies['auth_token']; // Assuming token is stored in cookies

  // If there's no token, redirect to login
  if (!token) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // If there's a callback, execute it
  if (callback) {
    return callback(context);
  }

  // Otherwise, just continue
  return {
    props: {},
  };
};

/**
 * Utility function to check if a user is already authenticated
 * and redirect to dashboard if authenticated
 */
export const withoutAuth = async (
  context: GetServerSidePropsContext<ParsedUrlQuery>,
  callback?: (context: GetServerSidePropsContext<ParsedUrlQuery>) => Promise<any>
) => {
  const { req } = context;
  const token = req.cookies['auth_token']; // Assuming token is stored in cookies

  // If there's a token, redirect to dashboard
  if (token) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  // If there's a callback, execute it
  if (callback) {
    return callback(context);
  }

  // Otherwise, just continue
  return {
    props: {},
  };
};

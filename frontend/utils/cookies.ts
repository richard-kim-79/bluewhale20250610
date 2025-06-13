/**
 * Utility functions for handling cookies in the browser
 */

// Set a cookie with the given name, value and optional options
export const setCookie = (name: string, value: string, options: any = {}): void => {
  const cookieOptions = {
    path: '/',
    ...options
  };

  if (options.expires instanceof Date) {
    cookieOptions.expires = options.expires.toUTCString();
  }

  let updatedCookie = encodeURIComponent(name) + '=' + encodeURIComponent(value);

  for (const optionKey in cookieOptions) {
    updatedCookie += '; ' + optionKey;
    const optionValue = cookieOptions[optionKey];
    if (optionValue !== true) {
      updatedCookie += '=' + optionValue;
    }
  }

  document.cookie = updatedCookie;
};

// Get a cookie by name
export const getCookie = (name: string): string | undefined => {
  const matches = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)')
  );
  return matches ? decodeURIComponent(matches[1]) : undefined;
};

// Delete a cookie by name
export const deleteCookie = (name: string): void => {
  setCookie(name, '', {
    'max-age': -1
  });
};

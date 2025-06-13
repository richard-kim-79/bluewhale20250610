import { ComponentType } from 'react';

declare function withAuth<P extends object>(WrappedComponent: ComponentType<P>): ComponentType<P>;

export default withAuth;

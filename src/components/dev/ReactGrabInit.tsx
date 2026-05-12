import { useEffect } from 'react';

// react-grab: dev-only tool for copying React component context (file, component name, HTML)
// This component is only rendered when REACT_GRAB=true is set in .env
export default function ReactGrabInit() {
  useEffect(() => {
    import('react-grab');
  }, []);

  return null;
}

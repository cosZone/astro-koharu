import { useEffect } from 'react';

export default function ReactGrabInit() {
  useEffect(() => {
    import('react-grab');
  }, []);

  return null;
}

import React from 'react';
import { Layout } from './Layout';
import { ProtectedRoute } from './ProtectedRoute';

export function AuthenticatedLayout() {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}

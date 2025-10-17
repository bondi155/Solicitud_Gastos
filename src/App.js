import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Routes/Login';
import Inicio from './Routes/Inicio';
import PrivateRoute from './Routes/PrivateRoute';
import Dashboard from './Components/Dashboard';
import { AuthProvider } from './Components/AuthContext';
import SetupInterceptors from './Components/SetupInterceptors';
import AuthInitializer from './Components/AuthInitializer';
import Solicitud from './Routes/Solicitud';
import ListaSolContainer from './Routes/ListaSolContainer';
import ReportesContainer from './Routes/ReportesContainer';
import ConfigContainer from './Routes/ConfigContainer';
function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename='/'>
        <AuthInitializer />
        <SetupInterceptors />
        <Routes>
          <Route path='/' element={<Navigate replace to='/login' />} />
          <Route path='/login' element={<Login />} />
          <Route path='/dashboard/*' element={<PrivateRoute />}>
            <Route path='' element={<Dashboard />}>
              <Route index element={<Navigate replace to='inicio' />} />
              <Route path='inicio' element={<Inicio />} />
              <Route index element={<Navigate replace to='Solicitud' />} />
              <Route path='Solicitud' element={<Solicitud />} />
              <Route index element={<Navigate replace to='ListaSolContainer' />} />
              <Route path='ListaSolContainer' element={<ListaSolContainer />} />
               <Route index element={<Navigate replace to='ReportesContainer' />} />
              <Route path='ReportesContainer' element={<ReportesContainer />} />
               <Route index element={<Navigate replace to='ConfigContainer' />} />
              <Route path='ConfigContainer' element={<ConfigContainer />} />
            </Route>
          </Route>
          <Route path='*' element={<Navigate replace to='/login' />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

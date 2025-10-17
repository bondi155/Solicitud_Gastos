import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import { createTheme } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/Dashboard';
import {
  AppProvider,
  AuthenticationContext,
  SessionContext,
} from '@toolpad/core/AppProvider';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { useDemoRouter } from '@toolpad/core/internal';
import logo from '../Components/img/logoCargaMenu.png';
import Inicio from '../Routes/Inicio';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import '../CSS/App.css';
import UploadFileIcon from '@mui/icons-material/UploadFile';
//import UserConfig from '../Routes/UserConfig';
//import CustomMenu from './CustomMenu';
import { MenuItem, Stack, Divider, ListItemIcon } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  AccountPreview,
  SignOutButton,
  AccountPopoverFooter,
} from '@toolpad/core/Account';
import Solicitud from '../Routes/Solicitud';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import ListaSolContainer from '../Routes/ListaSolContainer';
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed';
import ReportesContainer from '../Routes/ReportesContainer';
import TuneIcon from '@mui/icons-material/Tune';
import ConfigContainer from '../Routes/ConfigContainer';
const customTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-toolpad-color-scheme',
  },
  colorSchemes: {
    light: {
      palette: {
        background: {
          default: '#F9F9FE',
          paper: '#F9F9FE',
        },
        action: {
          hover: "#ffffff64", // Hover en light theme 
          focus: 'rgba(0, 14, 169, 0.89)',
          selected: '#e9e9e9', // Gris claro en selected (light theme)
        },
      },
    },
    dark: {
      palette: {
        background: {
          default: '#14171acc',
          paper: '#14171acc',
        },
        action: {
          hover: '#14171acc',
          focus: 'rgba(0, 14, 169, 0.89)',
          selected: '#2C2C2C', // Gris oscuro en selected (dark theme)
        },
      },
    },
  },
  components: {
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#828b8e', // Color inicial en gris claro
          '&.Mui-selected': {
            color: '#828b8e', // Gris claro en el ícono cuando está seleccionado
          },
          '&:hover': {
            color: 'grey', // Hover gris claro para light y dark
            backgroundColor: 'transparent',
          },
          // Cambiar el color del ícono cuando se activa el modo oscuro
          '& svg[data-testid="DarkModeIcon"]': {
            color: '#828b8e', // Gris claro para el ícono de modo oscuro en tema claro
          },
          '& svg[data-testid="DarkModeIcon"]:hover': {
            color: '#1176eaff', // Hover naranja para el icono de modo oscuro
          },
          '& svg[data-testid="LightModeIcon"]': {
            color: '#FFFFFF', // Blanco para el ícono de modo claro en tema oscuro
          },
          '& svg[data-testid="LightModeIcon"]:hover': {
            color: '#1176eaff', // Hover gris claro para el ícono en tema oscuro
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#e9e9e9', // Fondo gris claro cuando está seleccionado en light
            color: '#1176eaff', // Naranja claro en texto cuando está seleccionado
            '& .MuiListItemIcon-root .MuiSvgIcon-root': {
              color: '#1176eaff', // Cambia color del ícono SVG cuando está seleccionado
            },
            '& .MuiListItemText-root .MuiTypography-root': {
              color: 'grey', // Cambia color del texto (Typography) cuando está seleccionado
            },
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.5)', // Fondo gris oscuro en hover cuando está seleccionado
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(221, 221, 221, 0.97)', // Fondo en hover cuando no está seleccionado
            '& .MuiListItemIcon-root .MuiSvgIcon-root': {
              color: '#1176eaff', // Color mor claro en íconos en hover
            },
            '& .MuiListItemText-root .MuiTypography-root': {
              color: '#1176eaff', // Color mor claro en texto en hover
            },
          },
        },
      },
    },
  },
});
function CustomMenu({ router }) {
  const handleConfigClick = () => {
    router.navigate('/userConfig');
  };

  return (
    <Stack direction='column'>
      <AccountPreview variant='expanded' />
      <Divider />
      <MenuItem onClick={handleConfigClick}>
        <ListItemIcon>
          <SettingsIcon fontSize='small' />
        </ListItemIcon>
        Configuración
      </MenuItem>
      <Divider />
      <AccountPopoverFooter>
        <SignOutButton />
      </AccountPopoverFooter>
    </Stack>
  );
}
function DemoPageContent({ pathname }) {
  return (
    <Box
      sx={{
        py: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',  // textAlign: 'center',
        width: '100%',
      }}
    >
      {pathname === '/dashboard' && (
        <Inicio /> //  <Typography variant='h4'>Welcome to the Dashboard</Typography>
      )}
      {pathname === '/inicio' && <Inicio />}
      {pathname === '/' && <Inicio />}
      {pathname === '/ListaSolContainer' && <ListaSolContainer />}
      {pathname === '/Solicitud' && <Solicitud />}
      {pathname === '/Reportes' && <ReportesContainer />}
      {pathname === '/ConfigContainer' && <ConfigContainer />}
    </Box>
  );
}

DemoPageContent.propTypes = {
  navigate: PropTypes.func.isRequired,
  pathname: PropTypes.string.isRequired,
};

function DashboardLayoutPattern() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const router = useDemoRouter('/dashboard');

  const [session, setSession] = useState(null);


  
  const Datasession = useMemo(() => {
    if (!user) return null;
    
    // Calculas aquí las fracciones del string
    const nombreSinUltimo = user.username.slice(0, -1);
    const ultimoCaracter = user.username.slice(-1);
  
    return {
      user: {
        name: user.username,
        email: 'Perfil: ' + user.role,
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(nombreSinUltimo)}+${encodeURIComponent(ultimoCaracter)}&size=200`,
      },
    };
  }, [user]); // Sólo depende de "user"para evitar re-renders innecesarios

  // Actualizar `session` cada vez que `user` cambie
  useEffect(() => {
    if (Datasession) {
      setSession(Datasession);
    }
  }, [Datasession]);

  const authentication = {
    signIn: () => {
      setSession(Datasession);
    },
    signOut: () => {
      logout();
      setSession(null);
      navigate('/');
    },
  };

  return (
    <AppProvider
      branding={{
        logo: <img src={logo} alt='logo menu' />,
        title: '',
        color: '#FFB74D',
      }}
      navigation={[
        { kind: 'header', title: 'Menu' },
        { segment: 'dashboard', title: 'Dashboard', icon: <DashboardIcon /> },
        // { segment: 'inicio', title: 'Inicio', icon: <HomeIcon /> },
        {
          segment: 'Solicitud',
          title: 'Carga de Solicitud',
          icon: <UploadFileIcon />,
        },
        {
          segment: 'ListaSolContainer',
          title: 'Lista de Solicitudes',
          icon: <ChecklistRtlIcon />,
        },
         {
          segment: 'Reportes',
          title: 'Reportes',
          icon: <DynamicFeedIcon />,
        },
        {
          segment: 'ConfigContainer',
          title: 'Configuración de Gastos',
          icon: <TuneIcon />,
        },
        { kind: 'divider' },
      ]}
      router={router}
      theme={customTheme}
    >
      <AuthenticationContext.Provider value={authentication}>
        <SessionContext.Provider value={session}>
          <DashboardLayout
            defaultSidebarCollapsed
            slotProps={{
              toolbarAccount: {
                localeText: {
                  signInLabel: 'Iniciar sesión',
                  signOutLabel: 'Cerrar sesión',
                },
                slots: {
                  popoverContent: (props) => (
                    <CustomMenu {...props} router={router} />
                  ),
                },
              },
            }}
          >
            <DemoPageContent pathname={router.pathname} navigate={navigate} />
          </DashboardLayout>
        </SessionContext.Provider>
      </AuthenticationContext.Provider>
    </AppProvider>
  );
}

export default DashboardLayoutPattern;

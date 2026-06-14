import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MenuIcon from '@mui/icons-material/Menu';
import MicNoneIcon from '@mui/icons-material/MicNone';
import TranslateIcon from '@mui/icons-material/Translate';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import './Shell.css';

const DRAWER_WIDTH = 260;

const navItems = [
  { to: '/chat', label: 'Chat', icon: <ChatBubbleOutlineIcon /> },
  { to: '/translate', label: 'Translation', icon: <TranslateIcon /> },
  { to: '/speech', label: 'Speech to text', icon: <MicNoneIcon /> },
];

export function Shell() {
  const theme = useTheme();
  const isHandset = useMediaQuery(theme.breakpoints.down('sm'));
  const [drawerOpen, setDrawerOpen] = useState(!isHandset);

  useEffect(() => {
    setDrawerOpen(!isHandset);
  }, [isHandset]);

  const closeDrawerIfHandset = () => {
    if (isHandset) {
      setDrawerOpen(false);
    }
  };

  const drawer = (
    <Box className="shell-sidenav" role="navigation">
      <div className="shell-sidenav__brand">
        <span className="shell-sidenav__logo" aria-hidden="true">
          ✦
        </span>
        <span className="shell-sidenav__brand-text">Workspace</span>
      </div>
      <List className="shell-nav-list">
        {navItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            end
            className="shell-nav-link"
            onClick={closeDrawerIfHandset}
          >
            <ListItemIcon className="shell-nav-link__icon">{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <AppBar
        position="fixed"
        className="shell-toolbar"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          {isHandset && (
            <IconButton
              color="inherit"
              edge="start"
              aria-label="Open navigation"
              className="shell-menu-btn"
              onClick={() => setDrawerOpen((open) => !open)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <AutoAwesomeIcon className="shell-toolbar__spark" aria-hidden="true" />
          <Box className="shell-toolbar__titles">
            <span className="shell-toolbar__title">HF Models Integration</span>
            <span className="shell-toolbar__tagline">Chat, translation & voice capture</span>
          </Box>
          <Box className="shell-toolbar__spacer" />
          <span className="shell-toolbar__pill" aria-hidden="true">
            Beta
          </span>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
        {isHandset ? (
          <Drawer
            variant="temporary"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
                border: 'none',
              },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            open
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
                border: 'none',
              },
            }}
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        className="shell-content"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar />
        <Box className="shell-main">
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

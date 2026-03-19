/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIAssistant from './pages/AIAssistant';
import AITestSuite from './pages/AITestSuite';
import Abonnementen from './pages/Abonnementen';
import Billing from './pages/Billing';
import CompanyOnboarding from './pages/CompanyOnboarding';
import CompanySelect from './pages/CompanySelect';
import CompanySettings from './pages/CompanySettings';
import Dashboard from './pages/Dashboard';
import DepartmentDetails from './pages/DepartmentDetails';
import Departments from './pages/Departments';
import Employees from './pages/Employees';
import FunctionsSkills from './pages/FunctionsSkills';
import Landing from './pages/Landing';
import LocationTypes from './pages/LocationTypes';
import Locations from './pages/Locations';
import MedewerkerApp from './pages/MedewerkerApp';
import MijnBerichten from './pages/MijnBerichten';
import PlanningTemplates from './pages/PlanningTemplates';
import PlanningTool from './pages/PlanningTool';
import RoosterDashboard from './pages/RoosterDashboard';
import ScheduleEditor from './pages/ScheduleEditor';
import ScheduleOverview from './pages/ScheduleOverview';
import Schedules from './pages/Schedules';
import SwapRequests from './pages/SwapRequests';
import VacationRequests from './pages/VacationRequests';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAssistant": AIAssistant,
    "AITestSuite": AITestSuite,
    "Abonnementen": Abonnementen,
    "Billing": Billing,
    "CompanyOnboarding": CompanyOnboarding,
    "CompanySelect": CompanySelect,
    "CompanySettings": CompanySettings,
    "Dashboard": Dashboard,
    "DepartmentDetails": DepartmentDetails,
    "Departments": Departments,
    "Employees": Employees,
    "FunctionsSkills": FunctionsSkills,
    "Landing": Landing,
    "LocationTypes": LocationTypes,
    "Locations": Locations,
    "MedewerkerApp": MedewerkerApp,
    "MijnBerichten": MijnBerichten,
    "PlanningTemplates": PlanningTemplates,
    "PlanningTool": PlanningTool,
    "RoosterDashboard": RoosterDashboard,
    "ScheduleEditor": ScheduleEditor,
    "ScheduleOverview": ScheduleOverview,
    "Schedules": Schedules,
    "SwapRequests": SwapRequests,
    "VacationRequests": VacationRequests,
}

export const pagesConfig = {
    mainPage: "CompanySelect",
    Pages: PAGES,
    Layout: __Layout,
};
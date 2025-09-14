import React, { useState, useEffect } from 'react';
import { Building2, Briefcase, ChevronRight, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface JobRole {
  id: string;
  title: string;
}

interface Company {
  id: string;
  name: string;
  jobRoles: JobRole[];
}

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCompanies(companies);
    } else {
      const filtered = companies.filter((company) =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCompanies(filtered);
    }
  }, [searchTerm, companies]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies);
        setFilteredCompanies(data.companies);
      } else {
        setError('Failed to load companies');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleJobRoleClick = (companyId: string, jobRoleId: string) => {
    navigate(`/jobs/${jobRoleId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading companies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="text-red-800 font-medium">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with search at top-right */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Companies</h1>
            <p className="text-gray-600">Discover available job opportunities at top companies</p>
          </div>
          <div className="w-64 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={20} />
            </div>
            <input
              type="text"
              placeholder="Search companies..."
              className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Companies Grid */}
        <div className="grid gap-8">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              {/* Company Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-white bg-opacity-20 rounded-lg p-2">
                    <Building2 className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{company.name}</h2>
                    <p className="text-blue-100">
                      {company.jobRoles.length} open position{company.jobRoles.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Job Roles */}
              {company.jobRoles.length > 0 ? (
                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Briefcase className="text-gray-500" size={18} />
                    <h3 className="text-lg font-semibold text-gray-900">Available Positions</h3>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {company.jobRoles.map((jobRole) => (
                      <div
                        key={jobRole.id}
                        onClick={() => handleJobRoleClick(company.id, jobRole.id)}
                        className="group bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                            {jobRole.title}
                          </h4>
                          <ChevronRight
                            className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0"
                            size={16}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="text-gray-400 mb-2">
                    <Briefcase size={48} className="mx-auto" />
                  </div>
                  <p className="text-gray-500">No open positions at this time</p>
                </div>
              )}
            </div>
          ))}

          {filteredCompanies.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
              <p className="text-gray-500">Try adjusting your search term</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Companies;



// import React, { useState, useEffect } from 'react';
// import { Building2, Briefcase, ChevronRight } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
// interface JobRole {
//   id: string;
//   title: string;
// }

// interface Company {
//   id: string;
//   name: string;
//   jobRoles: JobRole[];
// }

// const Companies: React.FC = () => {
//   const [companies, setCompanies] = useState<Company[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const navigate = useNavigate();
//   useEffect(() => {
//     fetchCompanies();
//   }, []);

//   const fetchCompanies = async () => {
//     try {
//       const response = await fetch('http://localhost:5000/api/companies');
//       if (response.ok) {
//         const data = await response.json();
//         setCompanies(data.companies);
//       } else {
//         setError('Failed to load companies');
//       }
//     } catch (err) {
//       setError('Network error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleJobRoleClick = (companyId: string, jobRoleId: string) => {
//     console.log(`Clicked job role ${jobRoleId} at company ${companyId}`);
//     navigate(`/jobs/${jobRoleId}`);
    
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gray-50">
//         <div className="text-center">
//           <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
//           <p className="mt-4 text-gray-600 font-medium">Loading companies...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gray-50">
//         <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
//           <div className="text-red-800 font-medium">{error}</div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 py-8">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="mb-8">
//           <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Companies</h1>
//           <p className="text-gray-600">Discover available job opportunities at top companies</p>
//         </div>

//         <div className="grid gap-8">
//           {companies.map((company) => (
//             <div key={company.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
//               {/* Company Header */}
//               <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
//                 <div className="flex items-center space-x-3">
//                   <div className="bg-white bg-opacity-20 rounded-lg p-2">
//                     <Building2 className="text-white" size={24} />
//                   </div>
//                   <div>
//                     <h2 className="text-xl font-bold text-white">{company.name}</h2>
//                     <p className="text-blue-100">
//                       {company.jobRoles.length} open position{company.jobRoles.length !== 1 ? 's' : ''}
//                     </p>
//                   </div>
//                 </div>
//               </div>

//               {/* Job Roles */}
//               {company.jobRoles.length > 0 ? (
//                 <div className="p-6">
//                   <div className="flex items-center space-x-2 mb-4">
//                     <Briefcase className="text-gray-500" size={18} />
//                     <h3 className="text-lg font-semibold text-gray-900">Available Positions</h3>
//                   </div>
                  
//                   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
//                     {company.jobRoles.map((jobRole) => (
//                       <div
//                         key={jobRole.id}
//                         onClick={() => handleJobRoleClick(company.id, jobRole.id)}
//                         className="group bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-sm"
//                       >
//                         <div className="flex items-center justify-between">
//                           <h4 className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
//                             {jobRole.title}
//                           </h4>
//                           <ChevronRight 
//                             className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" 
//                             size={16} 
//                           />
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               ) : (
//                 <div className="p-6 text-center">
//                   <div className="text-gray-400 mb-2">
//                     <Briefcase size={48} className="mx-auto" />
//                   </div>
//                   <p className="text-gray-500">No open positions at this time</p>
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>

//         {companies.length === 0 && (
//           <div className="text-center py-12">
//             <Building2 className="mx-auto text-gray-400 mb-4" size={64} />
//             <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
//             <p className="text-gray-500">Check back later for new opportunities</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Companies;
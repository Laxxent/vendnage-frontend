import { useState } from "react";
import { useCreateRole } from "../../hooks/useRoles";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RoleFormData, roleSchema } from "../../schemas/roleSchema";
import { AxiosError } from "axios"; 
import { ApiErrorResponse } from "../../types/types";
import UserProfileCard from "../../components/UserProfileCard";
import { Link, useNavigate } from "react-router-dom";
import { getPagesByCategory, isPICRole, AVAILABLE_PAGES } from "../../utils/pagePermissions";
import SuccessNotification from "../../components/SuccessNotification";

const AddRole = () => {
  const { mutate: createRole, isPending } = useCreateRole();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [createdRoleName, setCreatedRoleName] = useState("");
  const [showGuideModal, setShowGuideModal] = useState(false);
  const pagesByCategory = getPagesByCategory();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema) as any,
    defaultValues: {
      permissions: [],
    },
  });

  const roleName = watch("name");

  const togglePermission = (path: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(path)) {
        return prev.filter(p => p !== path);
      } else {
        return [...prev, path];
      }
    });
  };

  const selectAllInCategory = (category: string) => {
    const categoryPages = pagesByCategory[category] || [];
    const categoryPaths = categoryPages.map(p => p.path);
    
    setSelectedPermissions(prev => {
      const newPermissions = [...prev];
      categoryPaths.forEach(path => {
        if (!newPermissions.includes(path)) {
          newPermissions.push(path);
        }
      });
      return newPermissions;
    });
  };

  const deselectAllInCategory = (category: string) => {
    const categoryPages = pagesByCategory[category] || [];
    const categoryPaths = categoryPages.map(p => p.path);
    
    setSelectedPermissions(prev => 
      prev.filter(path => !categoryPaths.includes(path))
    );
  };

  const onSubmit = (data: RoleFormData) => {
    setError("root", { type: "server", message: "" });

    const payload = {
      ...data,
      permissions: selectedPermissions,
    };

    createRole(payload, {
      onSuccess: () => {
        setCreatedRoleName(data.name);
        setShowSuccessNotification(true);
        setTimeout(() => {
          navigate("/roles");
        }, 1000);
      },
      onError: (error: AxiosError<ApiErrorResponse>) => {
        if (error.response) {
          const { message, errors } = error.response.data;

          if (message) {
            setError("root", { type: "server", message });
          }

          if (errors) {
            Object.entries(errors).forEach(([key, messages]) => {
              setError(key as keyof RoleFormData, { type: "server", message: messages[0] });
            });
          }
        }
      },
    });
  };

  const showPermissions = roleName && isPICRole(roleName);

  return (
    <>
      <div id="Top-Bar" className="flex items-center w-full gap-6 mt-[30px] mb-6">
        <div className="flex items-center gap-6 h-[92px] bg-white w-full rounded-3xl p-[18px]">
          <div className="flex flex-col gap-[6px] w-full">
            <h1 className="font-bold text-2xl">Add New Role</h1>
            <Link to={'/roles'}
              className="flex items-center gap-[6px] text-monday-gray font-semibold"
            >
              <img
                src="/assets/images/icons/arrow-left-grey.svg"
                className="size-4 flex shrink-0"
                alt="icon"
              />
              Manage Roles
            </Link>
          </div>
        </div>
        <UserProfileCard/>
      </div>
      <main className="flex flex-col gap-6 flex-1">
        <section
          id="Add-Role"
          className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
        >
          <form 
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col w-full h-fit gap-5 px-[18px]"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-xl capitalize">
                Complete the form
              </h2>
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="flex items-center justify-center size-10 rounded-full bg-monday-gray-background hover:bg-monday-gray transition-colors cursor-pointer flex-shrink-0"
                title="Quick Guide to Add New Role"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-gray-600"
                >
                  <path
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    stroke="#4B5563"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <label className="group relative">
              <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border ">
                <img
                  src="/assets/images/icons/user-octagon-grey.svg"
                  className="flex size-6 shrink-0"
                  alt="icon"
                />
              </div>
              <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                Role Name
              </p>
              <input
                {...register("name")}
                type="text"
                className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                placeholder=""
              />
            </label>
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}

            {showPermissions && (
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">
                    Page Access Permissions
                  </h3>
                  <p className="text-sm text-monday-gray">
                    Select which pages this role can access
                  </p>
                </div>

                {Object.entries(pagesByCategory).map(([category, pages]) => (
                  <div key={category} className="flex flex-col gap-3 p-4 rounded-2xl border border-monday-border">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-base">{category}</h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => selectAllInCategory(category)}
                          className="text-xs font-medium text-monday-blue hover:underline"
                        >
                          Select All
                        </button>
                        <span className="text-monday-gray">|</span>
                        <button
                          type="button"
                          onClick={() => deselectAllInCategory(category)}
                          className="text-xs font-medium text-monday-gray hover:underline"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {pages.map((page) => (
                        <label
                          key={page.path}
                          className="flex items-center gap-3 p-3 rounded-xl border border-monday-border hover:bg-monday-gray-background cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(page.path)}
                            onChange={() => togglePermission(page.path)}
                            className="size-5 rounded border-monday-border text-monday-blue focus:ring-monday-blue cursor-pointer"
                          />
                          <span className="font-medium text-sm">{page.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between p-3 rounded-xl bg-monday-gray-background">
                  <span className="font-medium text-sm text-monday-gray">
                    Total Selected:
                  </span>
                  <span className="font-semibold text-base">
                    {selectedPermissions.length} of {AVAILABLE_PAGES.length} pages
                  </span>
                </div>
              </div>
            )}

            {errors.root && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{errors.root.message}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-4 mt-4">
              <Link to={'/roles'} className="btn btn-red font-semibold">
                Cancel
              </Link>
              <button 
                type="submit" 
                className="btn btn-primary font-semibold"
                disabled={isPending}
              >
                {isPending ? "Saving..." : "Save Role"}
              </button>
            </div>
          </form>
        </section>
      </main>
      <SuccessNotification
        isOpen={showSuccessNotification}
        onClose={() => setShowSuccessNotification(false)}
        title="Role Berhasil Ditambahkan"
        message="Role baru telah berhasil ditambahkan ke sistem."
        itemName={createdRoleName}
      />

      {showGuideModal && (
        <div className="modal flex flex-1 items-center justify-center h-full fixed top-0 w-full z-50">
          <div
            onClick={() => setShowGuideModal(false)}
            className="absolute w-full h-full bg-[#292D32B2] cursor-pointer"
          />
          <div className="relative flex flex-col w-[500px] shrink-0 rounded-3xl p-[18px] gap-5 bg-white max-h-[90vh] overflow-y-auto">
            <div className="modal-header flex items-center justify-between">
              <p className="font-semibold text-xl">Quick Guide to Add New Role</p>
              <button
                onClick={() => setShowGuideModal(false)}
                className="flex size-14 rounded-full items-center justify-center bg-monday-gray-background hover:bg-monday-gray transition-colors"
                title="Close"
              >
                <img
                  src="/assets/images/icons/close-circle-black.svg"
                  className="size-6"
                  alt="close icon"
                />
              </button>
            </div>
            <div className="modal-content flex flex-col gap-4">
              <ul className="flex flex-col gap-4">
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Clearly and accurately define role responsibilities to ensure
                    accountability
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    For PIC roles, select which pages they can access to control
                    their permissions
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Verify that no duplicate role names exist to maintain clarity and efficiency
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Ensure naming is clear, concise, and specific to enhance
                    understanding
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Thoroughly review all details before creating to ensure accuracy
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddRole;

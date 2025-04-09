import Link from 'next/link'
import { cn } from '@/lib/utils'
import { UserGroupIcon } from '@heroicons/react/24/outline'

const Sidebar = () => {
  const pathname = '/admin/users'
  const activeClass = 'bg-gray-100 dark:bg-gray-800'

  return (
    <div>
      {/* Find the admin navigation section and add a new link for user management */}
      {/* Look for something like: */}
      {/* { isAdmin && ( */}
      {/*   <div> */}
      {/*     <h2 className="...">Admin</h2> */}
      {/*     <ul> */}
      {/*       <li>...</li> */}
      {/*     </ul> */}
      {/*   </div> */}
      {/* )} */}

      {/* Add a new list item for user management: */}
      <li className="py-1">
        <Link 
          href="/admin/users" 
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
            pathname === '/admin/users' && activeClass
          )}
        >
          <UserGroupIcon className="h-5 w-5" />
          User Management
        </Link>
      </li>
    </div>
  )
}

export default Sidebar 
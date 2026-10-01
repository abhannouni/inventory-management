import { Link } from 'react-router-dom';

/** Avatar + name + email, linking to the employee's working-hours page. */
export default function EmployeeCell({ id, name, email }: { id: string; name: string; email: string }) {
  return (
    <Link to={`/hr/employees/${id}`} className="wh-employee">
      <span className="avatar">{name.charAt(0).toUpperCase()}</span>
      <span className="wh-employee-text">
        <span className="wh-employee-name">{name}</span>
        <span className="wh-muted">{email}</span>
      </span>
    </Link>
  );
}

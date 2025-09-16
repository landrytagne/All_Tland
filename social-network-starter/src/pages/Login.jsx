export default function Login() {
  return (
    <div className="p-4">
      <h2 className="text-2xl mb-4">Connexion</h2>
      <input type="email" placeholder="Email" className="block mb-2 p-2 border rounded w-full" />
      <input type="password" placeholder="Mot de passe" className="block mb-2 p-2 border rounded w-full" />
      <button className="bg-blue-500 text-white px-4 py-2 rounded">Se connecter</button>
    </div>
  );
}
import React from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaExchangeAlt, FaFileAlt, FaGoogle, FaUserGraduate } from 'react-icons/fa';

import ahmed from '../assets/images/ahmed.jpg';
import mohamed from '../assets/images/mohamed.jpg';

function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">PlagiaGuard</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition duration-300">Fonctionnalités</a>
              <a href="#about" className="text-gray-600 hover:text-blue-600 transition duration-300">À propos</a>
              <a href="#team" className="text-gray-600 hover:text-blue-600 transition duration-300">Équipe</a>
            </nav>
            <div className="flex space-x-4">
              <Link to="/login" className="text-blue-600 hover:text-blue-800 py-2 px-4 transition duration-300">Connexion</Link>
              <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300">
                S'inscrire
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-blue-100 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">Détectez le Plagiat en Toute Confiance</h1>
            <p className="text-xl text-gray-600 mb-8">PlagiaGuard est un outil avancé de détection de plagiat conçu pour les environnements académiques et de recherche.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-300 text-center">
                Commencer
              </Link>
              <a href="#features" className="bg-white hover:bg-gray-100 text-blue-600 font-semibold py-3 px-8 rounded-lg border border-blue-600 transition duration-300 text-center">
                En savoir plus
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Fonctionnalités Clés</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <FaSearch className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Détection Avancée de Plagiat</h3>
              <p className="text-gray-600">Vérifiez vos documents par rapport à de multiples sources, y compris le web, les bases de données académiques et vos propres documents.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <FaExchangeAlt className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Comparaison de Documents</h3>
              <p className="text-gray-600">Comparez deux documents pour identifier les similitudes et le plagiat potentiel entre eux.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <FaGoogle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Intégration Google Drive</h3>
              <p className="text-gray-600">Connectez votre Google Drive pour vérifier facilement les documents stockés dans votre cloud.</p>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div id="about" className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">À propos de PlagiaGuard</h2>
            <p className="text-gray-600 mb-4">
              PlagiaGuard est un Projet de Fin d'Études (PFE) visant à fournir une solution efficace pour la détection de plagiat
              dans les environnements académiques. Notre plateforme utilise des algorithmes avancés, notamment TF-IDF et les Embeddings IA, pour détecter les similitudes
              entre les documents.
            </p>
            <p className="text-gray-600 mb-6">
              Notre mission est d'aider les éducateurs, les étudiants et les chercheurs à maintenir l'intégrité académique en fournissant
              des outils fiables pour identifier le plagiat potentiel. Le système génère des rapports complets qui mettent en évidence
              le contenu correspondant et fournissent des scores de similarité.
            </p>
            <a href="#features" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-300 inline-block">
              Explorer les Fonctionnalités
            </a>
          </div>
        </div>
      </div>

      {/* Team Section - Using data array for easier editing */}
      <div id="team" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Notre Équipe</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[
              {
                id: 1,
                name: "Mohamed Abnoune",
                role: "Etudiant",
                imageSrc: mohamed
              },
              {
                id: 2,
                name: "Ahmed Amdich",
                role: "Etudiant",
                imageSrc: ahmed
              }
            ].map((member) => (
              <div key={member.id} className="bg-white p-6 rounded-lg shadow text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 overflow-hidden">
                  <img 
                    src={member.imageSrc}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.parentNode.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg></div>';
                    }}
                  />
                </div>
                <h4 className="font-semibold text-lg">{member.name}</h4>
                <p className="text-gray-500 mb-3">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-blue-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Prêt à Détecter le Plagiat ?</h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Rejoignez notre plateforme et accédez à des outils avancés de détection de plagiat pour garantir l'originalité de votre travail.
          </p>
          <Link to="/register" className="bg-white hover:bg-gray-100 text-blue-600 font-semibold py-3 px-8 rounded-lg transition duration-300 inline-block">
            S'inscrire Maintenant
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">PlagiaGuard</h3>
              <p className="text-gray-400">
                Une plateforme avancée de détection de plagiat conçue pour aider à maintenir l'intégrité académique.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Liens Rapides</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition duration-300">Fonctionnalités</a></li>
                <li><a href="#about" className="text-gray-400 hover:text-white transition duration-300">À propos</a></li>
                <li><a href="#team" className="text-gray-400 hover:text-white transition duration-300">Équipe</a></li>
                <li><Link to="/login" className="text-gray-400 hover:text-white transition duration-300">Connexion</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Contact</h3>
              <p className="text-gray-400">Université: Université Ibn Zohr</p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} PlagiaGuard. Tous droits réservés. Projet PFE.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
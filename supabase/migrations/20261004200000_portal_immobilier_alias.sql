-- Confirmed against the complete immobilier.ch inquiry: Avenue Druey 18, Lausanne.
insert into portal_visit_aliases(source,reference,annonce_id)
values('immobilier.ch','LOCATION_APP_102','1338e6b7-2014-47d0-818a-35122b2a753b') on conflict do nothing;
